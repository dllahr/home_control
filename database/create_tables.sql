create table measurement_unit (
	id integer primary key,
	name text not null,
	description text
);

create table measurement_type (
	id integer primary key,
	name text not null,
	description text
);

create table device (
	id text primary key
);

create table measurements (
	id integer primary key,

	device_id text not null,
	time integer not null,

	measurement_type_id integer not null,
	value real not null,
	measurement_unit_id text not null,

	foreign key (device_id) references device(id),
	foreign key (measurement_type_id) references measurement_type(id),
	foreign key (measurement_unit_id) references measurement_unit(id)
);

insert into measurement_type(name) values ('temperature');
insert into measurement_type(name) values ('light level');
insert into measurement_type(name) values ('hardware voltage');

insert into measurement_unit(name) values ('degrees Farenheit');
insert into measurement_unit(name) values ('count');
insert into measurement_unit(name) values ('voltage');

