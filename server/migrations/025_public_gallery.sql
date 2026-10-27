CREATE TABLE public_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  image_public_id text,
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(image_url)) > 0),
  CHECK (length(trim(alt_text)) > 0)
);

CREATE INDEX public_gallery_published_order ON public_gallery_images(sort_order, created_at) WHERE published;

INSERT INTO permissions(code,description) VALUES ('gallery.manage','Upload and manage public gallery images') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='admin' AND p.code='gallery.manage' ON CONFLICT DO NOTHING;

INSERT INTO public_gallery_images(image_url,caption,alt_text,sort_order,published)
VALUES
  ('/assets/photos/photo-1517838277536-f5f99be501cd.jpg','','SAREX Fitness Clinic gallery image 1',0,true),
  ('/assets/photos/photo-1549060279-7e168fcee0c2.jpg','','SAREX Fitness Clinic gallery image 2',1,true),
  ('/assets/photos/photo-1574680096145-d05b474e2155.jpg','','SAREX Fitness Clinic gallery image 3',2,true),
  ('/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg','','SAREX Fitness Clinic gallery image 4',3,true),
  ('/assets/photos/photo-1518611012118-696072aa579a.jpg','','SAREX Fitness Clinic gallery image 5',4,true),
  ('/assets/photos/photo-1534367507873-d2d7e24c797f.jpg','','SAREX Fitness Clinic gallery image 6',5,true),
  ('/assets/photos/photo-1492562080023-ab3db95bfbce.jpg','','SAREX Fitness Clinic gallery image 7',6,true),
  ('/assets/photos/photo-1500648767791-00dcc994a43e.jpg','','SAREX Fitness Clinic gallery image 8',7,true),
  ('/assets/photos/photo-1506794778202-cad84cf45f1d.jpg','','SAREX Fitness Clinic gallery image 9',8,true),
  ('/assets/photos/photo-1507003211169-0a1dd7228f2d.jpg','','SAREX Fitness Clinic gallery image 10',9,true),
  ('/assets/photos/photo-1519085360753-af0119f7cbe7.jpg','','SAREX Fitness Clinic gallery image 11',10,true),
  ('/assets/photos/images.jfif','','SAREX Fitness Clinic gallery image 12',11,true);
