"use client";

import { ChangeEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  content: string;
};

type ReviewEntry = {
  id: string;
  timestamp: string;
  summary: string;
  result: string;
};

const readableBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const systemPrompt =
  "당신은 꼼꼼한 시니어 엔지니어입니다. 구조화되고 우선순위가 정해진 코드 리뷰 피드백을 한국어로 제공하세요. 각 발견 사항에 대해 실행 가능한 수정 사항, 추가할 테스트, 그리고 보안 또는 성능 문제를 강조하세요.";

type InputMode = "file" | "manual";

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [reviewFocus, setReviewFocus] = useState(
    "버그, 가독성, 유지보수성, 성능, 테스트"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOutput, setReviewOutput] = useState("");
  const [history, setHistory] = useState<ReviewEntry[]>([]);

  const aggregateCode = useMemo(() => {
    if (inputMode === "file") {
      return files
        .map(
          (file) =>
            `// 파일: ${file.name}\n${file.content.trim() || "// (빈 파일)"}`
        )
        .join("\n\n");
    } else {
      return editorCode.trim()
        ? `// 수동 입력 코드\n${editorCode.trim()}`
        : "";
    }
  }, [files, editorCode, inputMode]);

  const selectedFile = files.find((file) => file.id === selectedFileId);

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    const readers: Promise<UploadedFile>[] = Array.from(fileList).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              content: reader.result?.toString() ?? "",
            });
          };
          reader.onerror = () =>
            reject(new Error(`${file.name} 파일 읽기에 실패했습니다.`));
          reader.readAsText(file);
        })
    );

    try {
      const uploaded = await Promise.all(readers);
      setFiles((prev) => [...prev, ...uploaded]);
      if (!selectedFileId && uploaded.length) {
        setSelectedFileId(uploaded[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  const handleRunReview = async () => {
    if (!apiKey.trim()) {
      setError("리뷰를 요청하기 전에 OpenAI API 키를 입력해주세요.");
      return;
    }

    if (!aggregateCode.trim()) {
      setError("리뷰를 요청하기 전에 최소 하나의 파일을 업로드하거나 코드를 붙여넣어주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const userPrompt = [
      `리뷰 포커스: ${reviewFocus}`,
      "각 발견 사항에 대해 심각도, 근본 원인, 구체적인 수정 사항을 제공해주세요. 모든 응답은 한국어로 작성해주세요.",
      "코드 묶음:",
      aggregateCode,
    ].join("\n\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(
          `OpenAI request failed (${response.status}): ${errorMessage}`
        );
      }

      const data = await response.json();
      const reviewText =
        data?.choices?.[0]?.message?.content ??
        "모델로부터 응답을 받지 못했습니다.";

      setReviewOutput(reviewText);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          summary: `파일 ${files.length}개, 수동 입력 ${editorCode.length}자`,
          result: reviewText,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "리뷰 요청 중 예기치 않은 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 overflow-x-hidden">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 py-6 sm:py-10 w-full box-border">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-600 font-medium">
            Intellivix Labs
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl break-words text-slate-900">
            AI 코드 리뷰 도우미
          </h1>
          <p className="text-base text-slate-600 break-words">
            파일을 업로드하거나 코드를 붙여넣어 GPT-4o mini를 이용해 코드를 리뷰할 수 있습니다. 
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[3fr,2fr] min-w-0">
          <div className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-md min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold break-words text-slate-900">OpenAI 접근</h2>
                  <p className="text-sm text-slate-600 break-words">
                    API 키는 저장되지 않습니다.
                  </p>
                </div>
              </div>
              <input
                type="password"
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none"
                placeholder="sk-..."
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <textarea
                className="mt-4 w-full max-h-[120px] overflow-y-auto rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none resize-none"
                rows={3}
                value={reviewFocus}
                onChange={(event) => setReviewFocus(event.target.value)}
                placeholder="리뷰 포커스 (예: 보안, 성능, 테스트)"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-md min-w-0">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
                <button
                  onClick={() => {
                    setInputMode("file");
                    setEditorCode("");
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                    inputMode === "file"
                      ? "text-sky-600 border-b-2 border-sky-600 bg-sky-50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  파일 업로드
                </button>
                <button
                  onClick={() => {
                    setInputMode("manual");
                    setFiles([]);
                    setSelectedFileId(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                    inputMode === "manual"
                      ? "text-sky-600 border-b-2 border-sky-600 bg-sky-50"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  수동 입력
                </button>
              </div>

              {inputMode === "file" ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold break-words text-slate-900">파일 업로드</h2>
                    <p className="text-sm text-slate-600 whitespace-nowrap flex-shrink-0">
                      {files.length}개 선택됨 •{" "}
                      {files.reduce((sum, file) => sum + file.size, 0) > 0
                        ? readableBytes(
                            files.reduce((sum, file) => sum + file.size, 0)
                          )
                        : "0 B"}
                    </p>
                  </div>
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-700 transition hover:border-sky-400 hover:bg-sky-50">
                    <span className="text-sm font-medium break-words text-center">
                      드래그 앤 드롭하거나 클릭하여 소스 파일 업로드
                    </span>
                    <span className="text-xs text-slate-500 break-words text-center">
                      UTF-8 텍스트 파일, 각 파일 최대 ~500 KB
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".ts,.tsx,.js,.jsx,.json,.py,.rb,.java,.cs,.go,.rs,.swift,.kt,.c,.cpp,.txt,.md"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {files.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedFileId(file.id)}
                            className={`rounded-full border px-3 py-1 text-xs transition max-w-full truncate ${
                              selectedFileId === file.id
                                ? "border-sky-500 bg-sky-100 text-sky-700"
                                : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                            }`}
                            title={file.name}
                          >
                            {file.name}
                          </button>
                        ))}
                      </div>
                      {selectedFile && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-600">
                            <span className="min-w-0 flex-1 truncate" title={selectedFile.name}>
                              {selectedFile.name} · {readableBytes(selectedFile.size)}
                            </span>
                            <button
                              onClick={() => removeFile(selectedFile.id)}
                              className="text-slate-700 transition hover:text-rose-600 flex-shrink-0"
                            >
                              제거
                            </button>
                          </div>
                          <pre className="max-h-[400px] overflow-y-auto overflow-x-auto rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-800">
                            <code className="block whitespace-pre">{selectedFile.content || "// 파일이 비어있습니다"}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold break-words text-slate-900">수동 코드 입력</h2>
                    <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
                      {editorCode.length.toLocaleString()}자
                    </span>
                  </div>
                  <textarea
                    className="mt-4 min-h-[220px] max-h-[500px] w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none resize-none"
                    placeholder="// 코드를 붙여넣으세요..."
                    value={editorCode}
                    onChange={(event) => setEditorCode(event.target.value)}
                  />
                  <p className="mt-3 text-xs text-slate-500">
                    코드를 직접 입력하거나 붙여넣어 리뷰를 받을 수 있습니다.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={handleRunReview}
              disabled={isLoading}
              className="w-full rounded-2xl bg-sky-600 px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-200 shadow-md"
            >
              {isLoading ? "리뷰 실행 중..." : "AI 리뷰 실행"}
            </button>
          </div>

          <div className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-md min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold break-words text-slate-900">리뷰 결과</h2>
                <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
                  {aggregateCode.length.toLocaleString()}자 리뷰됨
                </span>
              </div>
              {reviewOutput ? (
                <div className="mt-4 max-h-[600px] overflow-y-auto overflow-x-auto space-y-4 text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="text-slate-800">{children}</p>
                      ),
                      code: ({ children, className, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800 border border-slate-200"
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre className="overflow-x-auto text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          {children}
                        </pre>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4 list-disc text-slate-800">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-slate-900 font-semibold">{children}</strong>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-slate-900 font-bold text-xl">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-slate-900 font-bold text-lg">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-slate-900 font-semibold text-base">{children}</h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-slate-900 font-semibold">{children}</h4>
                      ),
                      h5: ({ children }) => (
                        <h5 className="text-slate-900 font-semibold">{children}</h5>
                      ),
                      h6: ({ children }) => (
                        <h6 className="text-slate-900 font-semibold">{children}</h6>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-slate-800">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="text-slate-800">{children}</ol>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="text-slate-800 border-l-4 border-slate-300 pl-4 italic">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          className="text-sky-600 hover:text-sky-700 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {reviewOutput}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  아직 리뷰가 없습니다. 파일을 업로드하거나 코드를 붙여넣고, API 키를 추가한 후
                  &ldquo;AI 리뷰 실행&rdquo;을 클릭하면 결과가 여기에 표시됩니다.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-md min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold break-words text-slate-900">히스토리</h2>
                <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
                  {history.length}개 리뷰
                </span>
              </div>
              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  과거 리뷰가 여기에 표시됩니다. 내용은 저장되지 않으며, 새로고침시 사라집니다. 
                </p>
              ) : (
                <ul className="mt-4 max-h-[500px] overflow-y-auto space-y-4">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="min-w-0 flex-1 break-words">
                          {new Date(entry.timestamp).toLocaleString("ko-KR")} ·{" "}
                          {entry.summary}
                        </span>
                        <button
                          className="text-sky-600 transition hover:text-sky-700 flex-shrink-0 font-medium"
                          onClick={() => setReviewOutput(entry.result)}
                        >
                          보기
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        로컬에 저장된 스냅샷입니다.
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>
        </section>
      </main>

      {error && (
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-6xl px-4 sm:px-6 pb-4 sm:pb-6 w-full box-border">
          <div className="rounded-2xl border-2 border-rose-400 bg-white backdrop-blur-sm shadow-2xl shadow-rose-200 px-4 sm:px-6 py-4 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-rose-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-rose-700 mb-1 break-words">
                    오류 발생
                  </h3>
                  <p className="text-sm text-rose-600 break-words min-w-0">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
