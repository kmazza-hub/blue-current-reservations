# Apply V40.38.0

Replace the four existing client files and add the six AIP modules included in this patch. Restart Node and open `http://localhost:8787/?pack=aip`.

The run scheduler does not use background timers and does not execute live actions automatically. Live-mode requests remain approval-pending.
