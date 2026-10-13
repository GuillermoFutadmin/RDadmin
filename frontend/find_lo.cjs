const fs = require('fs');
const sourceMap = require('source-map');

async function findAllConst() {
  const mapContent = fs.readFileSync('dist/assets/index-BTapbjkP.js.map', 'utf8');
  const consumer = await new sourceMap.SourceMapConsumer(mapContent);

  const bundle = fs.readFileSync('dist/assets/index-BTapbjkP.js', 'utf8');
  
  // Find ALL const/let short variable declarations (1-3 chars) from OUR source
  const pattern = /(?:const|let)\s+([a-zA-Z$_][a-zA-Z0-9$_]{0,2})\s*=/g;
  let match;
  const results = [];
  
  while ((match = pattern.exec(bundle)) !== null) {
    const idx = match.index;
    const before = bundle.substring(0, idx);
    const line = (before.match(/\n/g) || []).length + 1;
    const lastNL = before.lastIndexOf('\n');
    const col = idx - lastNL - 1;
    const pos = consumer.originalPositionFor({ line, column: col });
    
    // Only show entries from OUR source files (not node_modules)
    if (pos.source && !pos.source.includes('node_modules')) {
      results.push({
        varName: match[1],
        bundleLine: line,
        col,
        source: pos.source,
        srcLine: pos.line,
        decl: match[0].substring(0, 20)
      });
    }
  }
  
  // Print first 50 unique source locations
  const seen = new Set();
  results.forEach(r => {
    const key = `${r.source}:${r.srcLine}`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`"${r.varName}" → ${r.source}:${r.srcLine} (bundle ${r.bundleLine}:${r.col})`);
    }
  });
  
  consumer.destroy();
}

findAllConst().catch(console.error);
