INSERT INTO branches(name,address,phone,email,timezone,active)
SELECT concat(COALESCE(NULLIF(gs.brand_name,''),'SAREX'),' Main Branch'),
       gs.address,
       gs.phone,
       gs.email,
       'Africa/Lagos',
       true
FROM gym_settings gs
WHERE gs.id=true
  AND NOT EXISTS (SELECT 1 FROM branches WHERE active);