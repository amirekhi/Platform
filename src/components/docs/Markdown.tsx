"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidView } from "./MermaidView";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Open external links safely in a new tab.
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {c}
            </a>
          ),
          pre: ({ children: c }) => <>{c}</>,
          code: ({ className, children: c }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const text = String(c).replace(/\n$/, "");
            if (lang === "mermaid") return <MermaidView source={text} />;
            if (className) {
              return (
                <pre>
                  <code>{text}</code>
                </pre>
              );
            }
            return <code>{c}</code>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
