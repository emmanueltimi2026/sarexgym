const splitSoftBreaks = value => value.split('\n').flatMap((line, index) => [
  ...(index > 0 ? [{ type: 'break' }] : []),
  ...(line ? [{ type: 'text', value: line }] : []),
]);

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
