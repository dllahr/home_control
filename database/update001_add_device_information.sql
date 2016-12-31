PRAGMA foreign_keys = OFF;

create table device_type (
	id integer primary key,
	name text not null,
	description text
);

insert into device_type (id, name, description) values (1, "temperature monitor", "read the temperature and report to the API");
insert into device_type (id, name, description) values (2, "MOSFET thermostat", "thermostat that uses a pair of MOSFET's (metal-oxide-semiconductor field-effect transistor) to act as the switch");
insert into device_type (id, name, description) values (3, "SSR thermostat", "thermostat that uses a SSR (solid state relay) driven by an op-amp to act as the switch");

alter table device rename to device_old;

create table device (
	id text primary key,
	device_type_id integer not null,
	location text not null,
	agent_url text,
	physical_label text,

	foreign key (device_type_id) references device_type (id)
);
insert into device (id, device_type_id, location) select id, 1, "N/A" from device_old;

drop table device_old;

update device set location="sun room", physical_label="2", agent_url="https://agent.electricimp.com/FX_XEbPQn5VN" where id="23133eaa5ba5ceee";
update device set location="garage ceiling", physical_label="1" where id="233db2aa5ba5ceee";
update device set location="master bedroom, behind bed", physical_label="3" where id="2371a1aa5ba5ceee";
update device set device_type_id=2, location="master bedroom", agent_url="https://agent.electricimp.com/hfJqC0lKe_e8" where id="237da4aa5ba5ceee";
update device set device_type_id=3, location="downstairs", agent_url="https://agent.electricimp.com/P2nzbDdSCulg" where id="23576cab5ba5ceee";

