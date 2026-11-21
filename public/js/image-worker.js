/* 이미지 변환 Web Worker — OffscreenCanvas 로 브라우저 안에서만 처리 */
self.onmessage = function (e) {
  var d = e.data;
  createImageBitmap(d.file).then(function (bmp) {
    var size = fit(bmp.width, bmp.height, d.maxW, d.maxH);
    var canvas = new OffscreenCanvas(size.w, size.h);
    var ctx = canvas.getContext('2d');
    if (d.type === 'image/jpeg') {
      ctx.fillStyle = d.bg || '#ffffff';
      ctx.fillRect(0, 0, size.w, size.h);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, size.w, size.h);
    var ow = bmp.width, oh = bmp.height;
    bmp.close && bmp.close();
    return canvas.convertToBlob({ type: d.type, quality: d.quality }).then(function (blob) {
      self.postMessage({ id: d.id, ok: true, blob: blob, w: size.w, h: size.h, ow: ow, oh: oh });
    });
  }).catch(function (err) {
    self.postMessage({ id: d.id, ok: false, error: String(err && err.message || err) });
  });
};

function fit(w, h, maxW, maxH) {
  var r = 1;
  if (maxW && w > maxW) r = Math.min(r, maxW / w);
  if (maxH && h > maxH) r = Math.min(r, maxH / h);
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}
