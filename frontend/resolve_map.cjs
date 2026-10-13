const fs = require('fs');
const sourceMap = require('source-map');

async function resolve() {
  const mapContent = fs.readFileSync('dist/assets/index-BODWGEdl.js.map', 'utf8');
  const consumer = await new sourceMap.SourceMapConsumer(mapContent);
  console.log('235:42734 ->', consumer.originalPositionFor({ line: 235, column: 42734 }));
  console.log('235:48509 ->', consumer.originalPositionFor({ line: 235, column: 48509 }));
}
resolve();
