create table measurement_location_history (
    id integer primary key,
    name text not null,
    description text,
    last_measurement_id integer not null unique,

    foreign key (last_measurement_id) references measurements(id)
);
