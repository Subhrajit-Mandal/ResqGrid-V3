begin;
-- Provisioning authority fixes provenance; a simulator may not declare itself hardware.
alter table resqgrid.devices add column source_mode text not null default 'hardware' check(source_mode in ('hardware','simulated','replay'));
commit;
