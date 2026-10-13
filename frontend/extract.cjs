const fs = require('fs');

function extract() {
  const c = fs.readFileSync('dist/assets/index-BODWGEdl.js', 'utf8');
  const lines = c.split('\n');
  const L = lines[234];
  console.log(L.substring(Math.max(0, 42734 - 200), 42734 + 200));
}
extract();
