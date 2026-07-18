use reqwest::{
    header::{CONTENT_LENGTH, CONTENT_RANGE, ETAG},
    Client, StatusCode,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::Write,
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State};

const MODEL_DIRECTORY: &str = "local-llm";
const DOWNLOAD_EVENT: &str = "llm-download-progress";
const DICTIONARY_SYSTEM_PROMPT: &str = "你是 Aurora Dict 的离线中英学习词典。用户会提交一个词、短语或极短的中文词组。请仅依据可靠的常见语言知识作答，不编造词源、引文、语料来源或罕见用法。使用简体中文，并严格按以下顺序输出有内容的项目：\n释义：给出最常见的核心义项；\n用法：说明词性、典型搭配或语境；\n例句：给出一条简短双语例句；\n易混：仅在确有常见易混词时说明。\n每项简短，不要寒暄、追问、免责声明、思考过程或 Markdown 表格。";
const TRANSLATION_SYSTEM_PROMPT: &str = "你是 Aurora Dict 的离线中英翻译器。自动识别输入为中文或英文，并翻译为另一种语言。忠实保留段落、项目符号、数字、专有名词、标点和原文语气；不擅自扩写、解释或改写。只输出译文，不要标题、前缀、注释、Markdown 代码围栏或思考过程。";

#[derive(Clone, Copy)]
struct ModelDefinition {
    id: &'static str,
    name: &'static str,
    filename: &'static str,
    hugging_face_url: &'static str,
    mirror_url: &'static str,
}

const MODELS: [ModelDefinition; 3] = [
    ModelDefinition {
        id: "qwen3-0.6b",
        name: "Qwen3-0.6B",
        filename: "Qwen3-0.6B-Q8_0.gguf",
        hugging_face_url: "https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf?download=true",
        mirror_url: "https://hf-mirror.com/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf?download=true",
    },
    ModelDefinition {
        id: "qwen3-1.7b",
        name: "Qwen3-1.7B",
        filename: "Qwen3-1.7B-Q8_0.gguf",
        hugging_face_url: "https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q8_0.gguf?download=true",
        mirror_url: "https://hf-mirror.com/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q8_0.gguf?download=true",
    },
    ModelDefinition {
        id: "qwen3-4b",
        name: "Qwen3-4B",
        filename: "Qwen3-4B-Q4_K_M.gguf",
        hugging_face_url: "https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true",
        mirror_url: "https://hf-mirror.com/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true",
    },
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmModelStatus {
    model_id: String,
    installed: bool,
    size_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmStatus {
    engine_available: bool,
    message: String,
    models: Vec<LlmModelStatus>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    model_id: String,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
    complete: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmLookup {
    word: String,
    model_id: String,
    model_name: String,
    content: String,
    note: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmTranslation {
    source: String,
    translation: String,
    model_id: String,
    model_name: String,
    note: String,
}

struct LlmRuntime {
    model_id: String,
    base_url: String,
    child: Child,
}

pub struct LlmManager {
    runtime: Mutex<Option<LlmRuntime>>,
    downloading: AtomicBool,
}

impl Default for LlmManager {
    fn default() -> Self {
        Self {
            runtime: Mutex::new(None),
            downloading: AtomicBool::new(false),
        }
    }
}

impl Drop for LlmManager {
    fn drop(&mut self) {
        if let Ok(runtime) = self.runtime.get_mut() {
            if let Some(mut runtime) = runtime.take() {
                let _ = runtime.child.kill();
            }
        }
    }
}

fn model_definition(model_id: &str) -> Result<ModelDefinition, String> {
    MODELS
        .iter()
        .copied()
        .find(|model| model.id == model_id)
        .ok_or_else(|| "不支持的本地 AI 模型。".to_string())
}

fn model_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法取得应用数据目录：{error}"))?
        .join(MODEL_DIRECTORY);
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建本地模型目录：{error}"))?;
    Ok(directory)
}

fn model_path(app: &AppHandle, model: ModelDefinition) -> Result<PathBuf, String> {
    Ok(model_directory(app)?.join(model.filename))
}

fn target_triple() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        "aarch64-apple-darwin"
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        "x86_64-apple-darwin"
    }
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    {
        "aarch64-pc-windows-msvc"
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        "x86_64-pc-windows-msvc"
    }
    #[cfg(target_os = "linux")]
    {
        "x86_64-unknown-linux-gnu"
    }
}

fn engine_path(app: &AppHandle) -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("AURORA_LLAMA_SERVER") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Some(path);
        }
    }
    let resource_directory = app.path().resource_dir().ok()?;
    let extension = if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ""
    };
    let mut binary_names = vec![format!("llama-server-{}{}", target_triple(), extension)];
    #[cfg(target_os = "macos")]
    binary_names.push(format!("llama-server-universal-apple-darwin{extension}"));
    binary_names.push(format!("llama-server{extension}"));

    let mut directories = vec![
        resource_directory.clone(),
        resource_directory.join("binaries"),
    ];
    #[cfg(target_os = "macos")]
    if let Some(contents_directory) = resource_directory.parent() {
        directories.push(contents_directory.join("MacOS"));
    }
    if let Ok(current_executable) = std::env::current_exe() {
        if let Some(executable_directory) = current_executable.parent() {
            directories.push(executable_directory.to_path_buf());
        }
    }
    directories
        .into_iter()
        .flat_map(|directory| binary_names.iter().map(move |name| directory.join(name)))
        .find(|path| path.is_file())
}

fn engine_message(app: &AppHandle) -> String {
    if engine_path(app).is_some() {
        "本地 AI 引擎已就绪。".into()
    } else {
        "本地 AI 引擎不可用，请重新安装 Aurora Dict，或在开发环境设置 AURORA_LLAMA_SERVER。".into()
    }
}

#[tauri::command]
pub fn llm_status(app: AppHandle) -> Result<LlmStatus, String> {
    let models = MODELS
        .iter()
        .copied()
        .map(|model| {
            let path = model_path(&app, model)?;
            let size_bytes = fs::metadata(&path)
                .map(|metadata| metadata.len())
                .unwrap_or(0);
            Ok(LlmModelStatus {
                model_id: model.id.into(),
                installed: size_bytes > 0,
                size_bytes,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(LlmStatus {
        engine_available: engine_path(&app).is_some(),
        message: engine_message(&app),
        models,
    })
}

#[tauri::command]
pub async fn download_llm_model(
    app: AppHandle,
    manager: State<'_, LlmManager>,
    model_id: String,
    download_source: Option<String>,
) -> Result<(), String> {
    let model = model_definition(&model_id)?;
    if manager.downloading.swap(true, Ordering::AcqRel) {
        return Err("已有本地模型正在下载，请等待其完成。".into());
    }
    let result = download_model(&app, model, download_source.as_deref()).await;
    manager.downloading.store(false, Ordering::Release);
    result
}

async fn download_model(
    app: &AppHandle,
    model: ModelDefinition,
    download_source: Option<&str>,
) -> Result<(), String> {
    let download_url = model_download_url(model, download_source)?;
    download_model_from_url(app, model, download_url)
        .await
        .map_err(|error| {
            format!(
                "{error}\n\n{}",
                manual_download_instruction(app, model, download_url)
            )
        })
}

fn model_download_url(
    model: ModelDefinition,
    download_source: Option<&str>,
) -> Result<&'static str, String> {
    match download_source.unwrap_or("mirror") {
        "mirror" => Ok(model.mirror_url),
        "official" => Ok(model.hugging_face_url),
        _ => Err("未知的模型下载地址，请在设置中重新选择。".into()),
    }
}

fn manual_download_instruction(
    app: &AppHandle,
    model: ModelDefinition,
    download_url: &str,
) -> String {
    match model_path(app, model) {
        Ok(path) => format!(
            "自动下载失败。请手动从以下地址下载：\n{}\n\n下载后请保留文件名“{}”，并将文件放入：\n{}\n\n重启 Aurora Dict 或重新打开设置页后即可识别。",
            download_url,
            model.filename,
            path.display()
        ),
        Err(_) => format!(
            "自动下载失败。请手动从以下地址下载，并保留文件名“{}”。应用无法取得本地模型目录，请确认应用数据目录可写。\n{}",
            model.filename, download_url
        ),
    }
}

async fn download_model_from_url(
    app: &AppHandle,
    model: ModelDefinition,
    download_url: &str,
) -> Result<(), String> {
    let destination = model_path(app, model)?;
    if fs::metadata(&destination)
        .map(|metadata| metadata.len() > 0)
        .unwrap_or(false)
    {
        return Ok(());
    }
    let temporary = destination.with_extension("gguf.part");
    let client = Client::builder()
        .user_agent("AuroraDictionary/0.1 local-llm downloader")
        .timeout(Duration::from_secs(60 * 30))
        .build()
        .map_err(|error| format!("无法初始化模型下载：{error}"))?;
    let mut response = client
        .get(download_url)
        .send()
        .await
        .map_err(|error| format!("无法下载 {}：{error}", model.name))?
        .error_for_status()
        .map_err(|error| format!("无法下载 {}：{error}", model.name))?;
    let total_bytes = response
        .content_length()
        .or_else(|| numeric_header(response.headers(), CONTENT_LENGTH.as_str()))
        .or_else(|| numeric_header(response.headers(), "x-linked-size"))
        .or_else(|| content_range_total(response.headers()));
    let expected_sha256 = response
        .headers()
        .get(ETAG)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.trim_matches('"').to_ascii_lowercase())
        .filter(|value| {
            value.len() == 64 && value.chars().all(|character| character.is_ascii_hexdigit())
        });
    let mut file =
        File::create(&temporary).map_err(|error| format!("无法写入模型文件：{error}"))?;
    let mut digest = Sha256::new();
    let mut downloaded_bytes = 0_u64;
    let _ = app.emit(
        DOWNLOAD_EVENT,
        DownloadProgress {
            model_id: model.id.into(),
            downloaded_bytes,
            total_bytes,
            complete: false,
        },
    );
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("下载模型时连接中断：{error}"))?
    {
        file.write_all(&chunk)
            .map_err(|error| format!("无法写入模型文件：{error}"))?;
        digest.update(&chunk);
        downloaded_bytes += chunk.len() as u64;
        let _ = app.emit(
            DOWNLOAD_EVENT,
            DownloadProgress {
                model_id: model.id.into(),
                downloaded_bytes,
                total_bytes,
                complete: false,
            },
        );
    }
    file.flush()
        .map_err(|error| format!("无法完成模型写入：{error}"))?;
    if let Some(expected) = expected_sha256 {
        let actual = format!("{:x}", digest.finalize());
        if actual != expected {
            let _ = fs::remove_file(&temporary);
            return Err("模型文件校验失败，下载已取消。".into());
        }
    }
    fs::rename(&temporary, &destination).map_err(|error| format!("无法保存模型文件：{error}"))?;
    let _ = app.emit(
        DOWNLOAD_EVENT,
        DownloadProgress {
            model_id: model.id.into(),
            downloaded_bytes,
            total_bytes,
            complete: true,
        },
    );
    Ok(())
}

fn numeric_header(headers: &reqwest::header::HeaderMap, name: &str) -> Option<u64> {
    headers.get(name)?.to_str().ok()?.trim().parse().ok()
}

fn content_range_total(headers: &reqwest::header::HeaderMap) -> Option<u64> {
    headers
        .get(CONTENT_RANGE)?
        .to_str()
        .ok()?
        .rsplit_once('/')?
        .1
        .trim()
        .parse()
        .ok()
}

#[tauri::command]
pub fn delete_llm_model(
    app: AppHandle,
    manager: State<'_, LlmManager>,
    model_id: String,
) -> Result<(), String> {
    let model = model_definition(&model_id)?;
    if let Ok(mut runtime) = manager.runtime.lock() {
        if runtime
            .as_ref()
            .is_some_and(|current| current.model_id == model.id)
        {
            if let Some(mut current) = runtime.take() {
                let _ = current.child.kill();
            }
        }
    }
    let path = model_path(&app, model)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("无法删除本地模型：{error}"))?;
    }
    Ok(())
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'static str,
    messages: Vec<ChatMessage<'a>>,
    temperature: f32,
    top_p: f32,
    max_tokens: u16,
    stream: bool,
}

#[derive(Serialize)]
struct ChatMessage<'a> {
    role: &'static str,
    content: &'a str,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatResponseMessage,
}

#[derive(Deserialize)]
struct ChatResponseMessage {
    content: Option<String>,
}

fn resolved_system_prompt(system_prompt: Option<String>, fallback: &str) -> Result<String, String> {
    let prompt = system_prompt.unwrap_or_default();
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Ok(fallback.to_string());
    }
    if prompt.chars().count() > 8_000 {
        return Err("本地 AI 系统提示词过长，请限制在 8,000 个字符以内。".into());
    }
    Ok(prompt.to_string())
}

#[tauri::command]
pub async fn lookup_llm(
    app: AppHandle,
    manager: State<'_, LlmManager>,
    model_id: String,
    query: String,
    system_prompt: Option<String>,
) -> Result<LlmLookup, String> {
    let model = model_definition(&model_id)?;
    let query = query.split_whitespace().collect::<Vec<_>>().join(" ");
    if query.is_empty() {
        return Err("请输入要查询的词语。".into());
    }
    if query.chars().count() > 100 {
        return Err("查询内容过长，请限制在 100 个字符以内。".into());
    }
    let system_prompt = resolved_system_prompt(system_prompt, DICTIONARY_SYSTEM_PROMPT)?;
    let path = model_path(&app, model)?;
    if !path.is_file() {
        return Err(format!("{} 尚未下载，请在设置中下载模型。", model.name));
    }
    let base_url = ensure_server(&app, &manager, model, &path).await?;
    let user_prompt = format!("词条：{query}\n请直接给出词典结果。\n/no_think");
    let content = complete_local_request(&base_url, &system_prompt, &user_prompt, 420).await?;
    Ok(LlmLookup {
        word: query,
        model_id: model.id.into(),
        model_name: model.name.into(),
        content,
        note: "由本地 AI 模型生成，仅供语言学习参考。".into(),
    })
}

#[tauri::command]
pub async fn translate_llm(
    app: AppHandle,
    manager: State<'_, LlmManager>,
    model_id: String,
    text: String,
    system_prompt: Option<String>,
) -> Result<LlmTranslation, String> {
    let model = model_definition(&model_id)?;
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("请输入要翻译的文本。".into());
    }
    if text.chars().count() > 4_000 {
        return Err("翻译文本过长，请限制在 4,000 个字符以内。".into());
    }
    let system_prompt = resolved_system_prompt(system_prompt, TRANSLATION_SYSTEM_PROMPT)?;
    let path = model_path(&app, model)?;
    if !path.is_file() {
        return Err(format!("{} 尚未下载，请在设置中下载模型。", model.name));
    }
    let base_url = ensure_server(&app, &manager, model, &path).await?;
    let user_prompt = format!("待翻译文本：\n{text}\n\n请直接输出译文。\n/no_think");
    let translation =
        complete_local_request(&base_url, &system_prompt, &user_prompt, 1_024).await?;
    Ok(LlmTranslation {
        source: text,
        translation,
        model_id: model.id.into(),
        model_name: model.name.into(),
        note: "由本地 AI 模型翻译。".into(),
    })
}

async fn complete_local_request(
    base_url: &str,
    system: &str,
    user_prompt: &str,
    max_tokens: u16,
) -> Result<String, String> {
    let payload = ChatRequest {
        model: "local-qwen",
        messages: vec![
            ChatMessage {
                role: "system",
                content: system,
            },
            ChatMessage {
                role: "user",
                content: &user_prompt,
            },
        ],
        temperature: 0.2,
        top_p: 0.85,
        max_tokens,
        stream: false,
    };
    let request_body = serde_json::to_string(&payload)
        .map_err(|error| format!("无法构造本地 AI 请求：{error}"))?;
    let client = Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(75))
        .build()
        .map_err(|error| format!("无法初始化本地 AI 请求：{error}"))?;
    let endpoint = format!("{base_url}/v1/chat/completions");
    let mut attempt = 0_u8;
    let response = loop {
        let response = client
            .post(&endpoint)
            .header("content-type", "application/json")
            .body(request_body.clone())
            .send()
            .await
            .map_err(|error| format!("本地 AI 模型未能响应：{error}"))?;
        if response.status() == StatusCode::SERVICE_UNAVAILABLE && attempt < 11 {
            attempt += 1;
            tokio::time::sleep(Duration::from_millis(500)).await;
            continue;
        }
        break response
            .error_for_status()
            .map_err(|error| format!("本地 AI 查询失败：{error}"))?;
    };
    let response: ChatResponse = serde_json::from_str(
        &response
            .text()
            .await
            .map_err(|error| format!("无法读取本地 AI 响应：{error}"))?,
    )
    .map_err(|error| format!("无法解析本地 AI 响应：{error}"))?;
    response
        .choices
        .into_iter()
        .next()
        .and_then(|choice| choice.message.content)
        .map(|content| strip_thinking_content(&content))
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "本地 AI 没有返回可展示的内容。".to_string())
}

fn strip_thinking_content(content: &str) -> String {
    let content = content.trim();
    let without_thinking = content
        .rsplit_once("</think>")
        .map(|(_, answer)| answer)
        .unwrap_or(content);
    without_thinking
        .trim()
        .trim_start_matches("```text")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .to_string()
}

async fn ensure_server(
    app: &AppHandle,
    manager: &LlmManager,
    model: ModelDefinition,
    model_path: &Path,
) -> Result<String, String> {
    let previous = {
        let mut runtime = manager
            .runtime
            .lock()
            .map_err(|_| "本地 AI 运行状态不可用。".to_string())?;
        if let Some(current) = runtime.as_mut() {
            let running = current.child.try_wait().ok().flatten().is_none();
            if running && current.model_id == model.id {
                return Ok(current.base_url.clone());
            }
        }
        runtime.take()
    };
    if let Some(mut previous) = previous {
        let _ = previous.child.kill();
    }
    let engine = engine_path(app).ok_or_else(|| engine_message(app))?;
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("无法分配本地 AI 端口：{error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("无法读取本地 AI 端口：{error}"))?
        .port();
    drop(listener);
    let child = Command::new(engine)
        .args([
            "-m",
            model_path.to_string_lossy().as_ref(),
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
            "--ctx-size",
            "2048",
            "--parallel",
            "1",
            "--jinja",
            "--no-warmup",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动本地 AI 引擎：{error}"))?;
    let base_url = format!("http://127.0.0.1:{port}");
    let client = Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(1))
        .build()
        .map_err(|error| format!("无法检查本地 AI 引擎：{error}"))?;
    for _ in 0..120 {
        if client
            .get(format!("{base_url}/health"))
            .send()
            .await
            .is_ok_and(|response| response.status().is_success())
        {
            let mut runtime = manager
                .runtime
                .lock()
                .map_err(|_| "本地 AI 运行状态不可用。".to_string())?;
            *runtime = Some(LlmRuntime {
                model_id: model.id.into(),
                base_url: base_url.clone(),
                child,
            });
            return Ok(base_url);
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    let mut child = child;
    let _ = child.kill();
    Err("本地 AI 引擎启动超时。请确认模型文件完整，或重新下载模型。".into())
}

#[cfg(test)]
mod tests {
    use super::{
        model_definition, model_download_url, resolved_system_prompt, strip_thinking_content,
    };

    #[test]
    fn keeps_only_the_final_qwen_answer() {
        assert_eq!(
            strip_thinking_content("<think>internal reasoning</think>\n释义：机缘巧合"),
            "释义：机缘巧合"
        );
    }

    #[test]
    fn rejects_an_unknown_model_id() {
        assert!(model_definition("not-a-model").is_err());
    }

    #[test]
    fn uses_the_download_source_selected_by_the_user() {
        let model = model_definition("qwen3-0.6b").unwrap();
        assert!(model_download_url(model, Some("mirror"))
            .unwrap()
            .starts_with("https://hf-mirror.com/"));
        assert!(model_download_url(model, Some("official"))
            .unwrap()
            .starts_with("https://huggingface.co/"));
        assert!(model_download_url(model, Some("automatic")).is_err());
    }

    #[test]
    fn uses_custom_or_fallback_system_prompt() {
        assert_eq!(
            resolved_system_prompt(Some("  custom prompt  ".into()), "fallback").unwrap(),
            "custom prompt"
        );
        assert_eq!(
            resolved_system_prompt(Some("   ".into()), "fallback").unwrap(),
            "fallback"
        );
    }

    #[test]
    fn rejects_an_oversized_system_prompt() {
        assert!(resolved_system_prompt(Some("a".repeat(8_001)), "fallback").is_err());
    }
}
