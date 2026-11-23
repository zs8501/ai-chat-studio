import { isValidElement, memo, useRef, useState, type ComponentProps } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { copyText } from '../lib/utils';

function CodeBlock({ children, node: _node, ...rest }: ComponentProps<'pre'> & ExtraProps) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const className = isValidElement<{ className?: string }>(children) ? (children.props.className ?? '') : '';
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? 'text';

  const handleCopy = async () => {
    await copyText(ref.current?.innerText ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language}</span>
        <button className="text-btn" onClick={handleCopy}>
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre ref={ref} {...rest}>
        {children}
      </pre>
    </div>
  );
}

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];
const components = { pre: CodeBlock };

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
