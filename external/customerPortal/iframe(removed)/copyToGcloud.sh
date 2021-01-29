#!/bin/sh
python replace.py
gcloud compute copy-files ~/xcalar-gui/assets/customerPortal/_table_render.html xcalar@zd1:/tmp/todo-api/templates;
gcloud compute copy-files ~/xcalar-gui/assets/customerPortal/_error_license.html xcalar@zd1:/tmp/todo-api/templates;
