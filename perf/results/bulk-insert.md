# BULK INSERT

## Current 4.0.3 - 2018-10-16

```
bulk-insert-2018-16-10-pipeline x10: 21635.223ms
```

# 4.0.4 optimizations - 2018-10-18

Buffer.concat() usage and redundant buffering logic removal.

```
bulk-insert-2018-10-18-pipeline x10: 2490.231ms
bulk-insert-2018-10-18-pipeline x50: 8280.333ms
bulk-insert-2018-10-18-pipeline x100: 15802.916ms
```