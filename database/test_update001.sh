#!/bin/bash

db_file=/tmp/test_update001.sqlite3
if [ -e $db_file ]
then
	rm $db_file
fi

scripts="create_tables.sql add_devices.sql "

for s in $scripts
do
	echo applying script s:  $s

	sqlite3 "$db_file" < "$s"
done

insert_cmd='PRAGMA foreign_keys = ON; insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values ("23133eaa5ba5ceee", 2, 1, 3.0, 1);'
echo applying insert_cmd:  $insert_cmd
echo $insert_cmd | sqlite3 $db_file

echo applying update001_add_device_information.sql
sqlite3 $db_file < update001_add_device_information.sql

echo -------------------------
echo results
echo -------------------------
echo 'select * from device;'
echo 'select * from device;' | sqlite3 $db_file
echo

echo 'select * from measurements;'
echo 'select * from measurements;' | sqlite3 $db_file
echo

echo happy path adding measurement insert_cmd:  $insert_cmd
echo $insert_cmd | sqlite3 $db_file
r=$?
echo result r:  $r
if [ $r != 0 ]
then
	exit 1
else
	echo test passed
fi
echo

fk_fail_insert_cmd='PRAGMA foreign_keys = ON; insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values ("fake device", 2, 1, 3.0, 1);'
echo unhappy path add a measurement to a device that does not exisit, should be an foreign key failure - fk_fail_insert_cmd:  $fk_fail_insert_cmd
echo $fk_fail_insert_cmd | sqlite3 $db_file
r=$?
echo result r:  $r
if [ $r != 1 ]
then
	echo "**************TEST FAILED**************"
	exit 1
else
	echo test passed
fi
echo

echo done

