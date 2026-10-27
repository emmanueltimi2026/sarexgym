const splitSoftBreaks = value => value.split('\n').flatMap((line, index) => [
  ...(index > 0 ? [{ type: 'break' }] : []),
  ...(line ? [{ type: 'text', value: line }] : []),
]);

const tableCells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
const isMarkdownTableSeparator = line => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

// Convert model-generated pipe tables into compact lists that fit narrow chat panels.
export const normalizeAssistantMarkdown = markdown => {
  const lines = String(markdown || '').split('\n');
  const output = [];
  for (let index = 0; index < lines.length;) {
    if (index + 1 < lines.length && lines[index].includes('|') && isMarkdownTableSeparator(lines[index + 1])) {
      const headers = tableCells(lines[index]);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      output.push(rows.map(row => {
        const details = headers.slice(1).map((header, cellIndex) => {
          const value = row[cellIndex + 1];
          return value ? `- **${header || 'Details'}:** ${value}` : null;
        }).filter(Boolean);
        return [`**${row[0] || 'Details'}**`, ...details].join('\n');
      }).join('\n\n'));
      continue;
    }
    output.push(lines[index]);
    index += 1;
  }
  return output.join('\n');
};

export const remarkLineBreaks = () => tree => {
  const visit = node => {
    if (!Array.isArray(node.children)) return;
    node.children = node.children.flatMap(child =>
      child.type === 'text' && child.value.includes('\n')
        ? splitSoftBreaks(child.value)
        : [child]);
    node.children.forEach(visit);
  };
  visit(tree);
};
