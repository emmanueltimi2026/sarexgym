DROP TABLE IF EXISTS qr_credentials;
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'checkin.scan');
DELETE FROM permissions WHERE code = 'checkin.scan';