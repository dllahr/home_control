#!/bin/bash

db_file=$1

scripts="create_tables.sql add_devices.sql update001_add_device_information.sql"

for s in $scripts
do
	echo applying script s:  $s

	sqlite3 "$db_file" < "$s"
done

