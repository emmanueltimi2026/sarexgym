ALTER TABLE payments ADD COLUMN receipt_number text NOT NULL DEFAULT ('SRX-M-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));
ALTER TABLE payments ADD CONSTRAINT payments_receipt_number_unique UNIQUE(receipt_number);
ALTER TABLE event_registrations ADD COLUMN receipt_number text DEFAULT NULL;
ALTER TABLE event_registrations ADD CONSTRAINT event_receipt_number_unique UNIQUE(receipt_number);
