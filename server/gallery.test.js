import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const config = { NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session', SESSION_TTL_HOURS: 1,
  SESSION_IDLE_TIMEOUT_HOURS: 24, COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'gallery-test-secret-with-sufficient-entropy', TRUST_PROXY: 'false',
  secureCookies: false, CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret' };
const imageId = '8e33d5bd-fcca-44b5-a3b2-1e1df65dd001';
const seedImage = { id: imageId, image_url: '/assets/photos/seed.jpg', caption: '', alt_text: 'Seed image', sort_order: 0,
  published: true, image_public_id: null };

test('admins manage gallery uploads and publishing while the public API exposes published images only', async () => {
  const images = [{ ...seedImage }];
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: 'admin-user', email: 'admin@sarex.test',
      status: 'active', permissions: ['gallery.manage'], roles: ['admin'] }], rowCount: 1 };
    if (sql.startsWith('SELECT id,image_url,caption,alt_text,sort_order FROM public_gallery_images WHERE published'))
      return { rows: images.filter(image => image.published).map(({ id, image_url, caption, alt_text, sort_order }) => ({ id, image_url, caption, alt_text, sort_order })) };
    if (sql.startsWith('SELECT id,image_url,caption,alt_text,sort_order,published FROM public_gallery_images'))
      return { rows: [...images].sort((a, b) => a.sort_order - b.sort_order).map(({ id, image_url, caption, alt_text, sort_order, published }) => ({ id, image_url, caption, alt_text, sort_order, published })) };
    if (sql.startsWith('INSERT INTO public_gallery_images')) {
      const image = { id: '8e33d5bd-fcca-44b5-a3b2-1e1df65dd002', image_url: params[0], image_public_id: params[1], caption: params[2],
        alt_text: params[3], sort_order: images.length, published: false };
      images.push(image);
      return { rows: [{ id: image.id, image_url: image.image_url, caption: image.caption, alt_text: image.alt_text, sort_order: image.sort_order, published: image.published }], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE public_gallery_images SET')) {
      const image = images.find(item => item.id === params.at(-1));
      if (!image) return { rows: [], rowCount: 0 };
      const setPart = sql.slice('UPDATE public_gallery_images SET '.length, sql.indexOf(' WHERE'));
      for (const [, field, position] of [...setPart.matchAll(/([a-z_]+)=\$(\d+)/g)]) image[field] = params[Number(position) - 1];
      return { rows: [{ id: image.id, image_url: image.image_url, caption: image.caption, alt_text: image.alt_text, sort_order: image.sort_order, published: image.published }], rowCount: 1 };
    }
    if (sql.startsWith('DELETE FROM public_gallery_images')) {
      const index = images.findIndex(image => image.id === params[0]);
      if (index < 0) return { rows: [], rowCount: 0 };
      const [image] = images.splice(index, 1);
      return { rows: [{ image_public_id: image.image_public_id, caption: image.caption }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT id FROM public_gallery_images')) return { rows: [...images].sort((a, b) => a.sort_order - b.sort_order).map(({ id }) => ({ id })) };
    if (sql.startsWith('UPDATE public_gallery_images g SET sort_order=')) {
      params[0].forEach((id, index) => { const image = images.find(item => item.id === id); if (image) image.sort_order = index; });
      return { rows: [], rowCount: params[0].length };
    }
    return { rows: [], rowCount: 1 };
  };
  const db = { query, transaction: work => work({ query }) };
  const server = createApp({ db, config }).listen(0);
  const originalFetch = globalThis.fetch;
  const cloudinaryCalls = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('api.cloudinary.com')) {
      cloudinaryCalls.push(url);
      return { ok: true, json: async () => url.endsWith('/image/upload')
        ? { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/gallery/new.jpg', public_id: 'sarex/gallery/new' }
        : { result: 'ok' } };
    }
    return originalFetch(input, init);
  };
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const publicResponse = await fetch(`${base}/api/v1/public/gallery`);
    assert.equal(publicResponse.status, 200);
    assert.equal((await publicResponse.json()).data.length, 1);
    assert.match(calls.find(call => call.sql.includes('WHERE published'))?.sql || '', /WHERE published/);

    const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
    const csrf = (await (await fetch(`${base}/api/v1/csrf`, { headers })).json()).csrfToken;
    const adminHeaders = { ...headers, 'content-type': 'application/json', 'x-csrf-token': csrf };
    const adminList = await fetch(`${base}/api/v1/admin/gallery`, { headers });
    assert.equal(adminList.status, 200);
    const upload = await fetch(`${base}/api/v1/admin/gallery`, { method: 'POST', headers: adminHeaders,
      body: JSON.stringify({ imageData: 'data:image/png;base64,AA==', caption: 'New photo', altText: 'Members training together' }) });
    assert.equal(upload.status, 201);
    const created = (await upload.json()).data;
    assert.equal(created.published, false);
    assert.equal(created.caption, 'New photo');
    assert.equal(cloudinaryCalls.length, 1);

    const publish = await fetch(`${base}/api/v1/admin/gallery/${created.id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ published: true }) });
    assert.equal(publish.status, 200);
    assert.equal((await publish.json()).data.published, true);
    const visible = await fetch(`${base}/api/v1/public/gallery`);
    assert.equal((await visible.json()).data.length, 2);

    const reorder = await fetch(`${base}/api/v1/admin/gallery/reorder`, { method: 'PATCH', headers: adminHeaders,
      body: JSON.stringify({ ids: [created.id, imageId] }) });
    assert.equal(reorder.status, 204);
    const remove = await fetch(`${base}/api/v1/admin/gallery/${created.id}`, { method: 'DELETE', headers: { ...headers, 'x-csrf-token': csrf } });
    assert.equal(remove.status, 204);
    assert.equal(cloudinaryCalls.length, 2, 'deleting an uploaded image removes its Cloudinary asset');
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise(resolve => server.close(resolve));
  }
});
