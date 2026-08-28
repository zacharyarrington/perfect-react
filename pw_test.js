const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5179/');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/tmp/wf_01_map.png' });
  
  // Open workflow
  await page.click('[data-tooltip="Workflow Editor"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/wf_02_empty.png' });

  // Expand all palette groups
  const groupHeaders = await page.$$('.wf-palette-group-header');
  for (const h of groupHeaders) { await h.click(); await page.waitForTimeout(80); }
  await page.screenshot({ path: '/tmp/wf_03_palette.png', clip: { x: 0, y: 48, width: 210, height: 852 } });
  
  // Add nodes: reader, filter, bufferer, writer
  const items = await page.$$('.wf-palette-item');
  for (let i = 0; i < Math.min(5, items.length); i++) {
    await items[i].click();
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: '/tmp/wf_04_with_nodes.png' });

  // Close-up shots of each node
  const nodes = await page.$$('.wf-node');
  for (let i = 0; i < nodes.length; i++) {
    const bb = await nodes[i].boundingBox();
    if (!bb) continue;
    await page.screenshot({ path: `/tmp/wf_node_${i}.png`, clip: {
      x: Math.max(0, bb.x - 20), y: Math.max(0, bb.y - 20),
      width: bb.width + 40, height: bb.height + 80
    }});
  }
  
  await browser.close();
  console.log('done');
})();
