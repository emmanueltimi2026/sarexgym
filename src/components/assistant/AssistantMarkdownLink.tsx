import React from 'react';
import { getAssistantMarkdownHref } from '../../lib/assistantUi';

type AssistantMarkdownLinkProps = { href?: string; children?: React.ReactNode };

/** Keep model-generated Markdown links inert unless they target a known in-app route. */
export const AssistantMarkdownLink: React.FC<AssistantMarkdownLinkProps> = ({ href, children }) => {
  const safeHref = getAssistantMarkdownHref(href);
  if (!safeHref) return <>{children}</>;
  return <a href={safeHref} className="font-semibold text-[#d6161e] underline decoration-[#ef1b23]/35 underline-offset-2 hover:text-[#a90e15]">{children}</a>;
};

export default AssistantMarkdownLink;
