create table updates_applied (
    id integer primary key,
    script_name text not null unique
);

insert into updates_applied(script_name) values ('update001_add_device_information.sql');
insert into updates_applied(script_name) values ('update002_add_variable_location.sql');
insert into updates_applied(script_name) values ('update003_add_alert_setting.sql');
insert into updates_applied(script_name) values ('update004_add_update_tracking.sql');
