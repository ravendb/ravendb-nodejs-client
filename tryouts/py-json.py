import json

indexDef = {
  "Configuration": "1",
  "Fields": {},
  "Maps": ("testmap",) 
}

indexDefs = []
indexDefs.append(indexDef)

print json.dumps(indexDefs)
