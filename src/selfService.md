Team Self service flags:
- apply to Atribute Based Access Control (ABAC)
- are dynamic and cannot be embedded in schema
- that means that ABAC can be fully dynamic


```
type: object
properties:
  permissions:
    type: object
    properties:
      service:
        type: array
        items:
          type: string
          enum: [ingress]
        uniqueItems: true
      team:
        type: array
        items:
          type: string
          enum: [alerts, oidc, resourceQuota]
        uniqueItems: true
```

```
permissions:
  service:
    "ui:widget": "checkboxes"
  team:
    "ui:widget": "checkboxes"
```



```
permissions:
  service:
    - ingress
  team:
    - oidc
    - resourceQuota
```