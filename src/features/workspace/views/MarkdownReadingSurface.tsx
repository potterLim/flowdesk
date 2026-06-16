import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownReadingSurface({ content }: { content: string }) {
  return (
    <div className="flowdesk-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
