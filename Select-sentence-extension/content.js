const INLINE_TAGS = new Set(['A', 'SPAN', 'STRONG', 'I', 'EM', '#text']);
const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'BR','LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

document.addEventListener('click', (event) => {
  if (!event.altKey) return;

  const range = document.caretRangeFromPoint(event.clientX, event.clientY);
  if (!range) return;

  const sentenceRange = getSentenceRange(range.startContainer, range.startOffset);
  if (sentenceRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sentenceRange);
  }
}, true);

function getSentenceRange(startNode, offset) {
  const blockRoot = findBlockRoot(startNode);
  if (!blockRoot) return null;

  const walker = document.createTreeWalker(
    blockRoot,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  const texts = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
	const parentTag = node.parentNode?.nodeName ?? '';
	if (
	  !INLINE_TAGS.has(parentTag) &&
	  node.parentNode !== blockRoot // texte directement dans <p> ou <div>
	) continue;


    textNodes.push(node);
    texts.push(node.textContent);
  }

  const fullText = texts.join('');
  const targetIndex = findTextOffset(textNodes, startNode, offset);
  if (targetIndex === -1) return null;

  // Trouver les limites de phrase
  const before = fullText.slice(0, targetIndex);
  const after = fullText.slice(targetIndex);

  const startIdx = Math.max(
    before.lastIndexOf('\r') + 1,
    before.lastIndexOf('\n') + 1,
	before.lastIndexOf('.') +1,
    before.lastIndexOf('!') + 1,
    before.lastIndexOf('?') + 1,
    0
  );
  const endMatch = after.match(/[.!?\r\n]/);
  const endIdx = endMatch ? targetIndex + endMatch.index + 1 : fullText.length;


  // Reconstruire le range
  let runningOffset = 0;
  const range = document.createRange();
  let startSet = false;

  for (const node of textNodes) {
    const len = node.textContent.length;

    if (!startSet && startIdx >= runningOffset && startIdx <= runningOffset + len) {
      range.setStart(node, startIdx - runningOffset);
      startSet = true;
    }

    if (endIdx >= runningOffset && endIdx <= runningOffset + len) {
      range.setEnd(node, endIdx - runningOffset);
      break;
    }

    runningOffset += len;
  }

  return range;
}

function findTextOffset(nodes, targetNode, offset) {
  let pos = 0;
  for (const node of nodes) {
    if (node === targetNode) {
      return pos + offset;
    }
    pos += node.textContent.length;
  }
  return -1;
}

function findBlockRoot(node) {
  while (node && node !== document.body) {
    if (node.nodeType === 1 && BLOCK_TAGS.has(node.nodeName)) {
      return node;
    }
    node = node.parentNode;
  }
  return document.body;
}
