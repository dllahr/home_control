#!/bin/bash

db_file=$1

scripts="create_tables.sql add_devices.sql"

for s in $scripts update*.sql
do
	echo applying script s:  $s

	sqlite3 "$db_file" < "$s"
done
