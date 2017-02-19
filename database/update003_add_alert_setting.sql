create table alert_setting (
    id integer primary key,
    device_id text not null,
    measurement_type_id integer not null,
    comparison text not null,
    threshold real not null,

    unique (device_id, measurement_type_id, comparison),
    foreign key(device_id) references device(id),
    foreign key(measurement_type_id) references measurement_type(id),
    check(comparison in ("<"))
);

insert into alert_setting (device_id, measurement_type_id, comparison, threshold) select d.id, mt.id, "<", 38.0 from device d, measurement_type mt where mt.name="temperature";
