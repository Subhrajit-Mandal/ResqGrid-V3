begin;
-- This role is used only by a server holding validated user claims, never by a browser.
create or replace function resqgrid.agency_access(target_agency text,target_zone text,unassigned boolean default false) returns boolean language sql stable as $$
 select (resqgrid.has_role('agency_operator') or resqgrid.has_role('agency_coordinator')) and exists(select 1 from resqgrid.agency_members m join resqgrid.agencies a on a.id=m.agency_id where m.user_id::text=resqgrid.actor_id() and m.active and a.verified and (a.id=target_agency or unassigned and target_zone=any(a.zone_ids)))
$$;
revoke insert,update on resqgrid.roles,resqgrid.zones,resqgrid.agencies,resqgrid.teams,resqgrid.shelters,resqgrid.devices,resqgrid.disaster_events,resqgrid.risk_configurations,resqgrid.model_activations,resqgrid.recovery_assessments,resqgrid.alert_deliveries,resqgrid.jobs from resqgrid_api;
revoke select,update on resqgrid.outbox from resqgrid_api;
alter table resqgrid.outbox enable row level security;
create policy outbox_api_insert on resqgrid.outbox for insert to resqgrid_api with check(resqgrid.actor_id() is not null and resqgrid.actor_id()<>'public');
-- Operators may release a resource through the backend's validated incident transition.
drop policy resources_update on resqgrid.resources;
create policy resources_update on resqgrid.resources for update to resqgrid_api using(resqgrid.agency_access(agency_id,'',false)) with check(resqgrid.agency_access(agency_id,'',false));
-- Separate worker capability: telemetry processing has NO citizen location or message grants.
do $$ begin if not exists(select 1 from pg_roles where rolname='resqgrid_worker') then create role resqgrid_worker nologin nobypassrls; end if; end $$;
grant usage on schema resqgrid to resqgrid_worker;
grant select on resqgrid.devices,resqgrid.zones,resqgrid.risk_configurations,resqgrid.model_activations to resqgrid_worker;
grant select,insert,update on resqgrid.jobs to resqgrid_worker;
grant select,update on resqgrid.outbox to resqgrid_worker;
grant usage,select on sequence resqgrid.jobs_id_seq to resqgrid_worker;
create policy outbox_worker_read on resqgrid.outbox for select to resqgrid_worker using(true);
create policy outbox_worker_update on resqgrid.outbox for update to resqgrid_worker using(true) with check(true);
-- References are backend-only and read-only to the API. Revoke public defaults explicitly.
revoke all on all tables in schema resqgrid from anon,authenticated;
revoke all on all sequences in schema resqgrid from anon,authenticated;
commit;
