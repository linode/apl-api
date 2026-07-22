# ADR: Replace Backtracking-Prone Validation Regexes

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** APL engineering
- **Scope:** Validation patterns in the shared schema definitions

## Context

Several validation patterns used nested repetitions, overlapping alternatives, optional repeated groups, or broadly matching expressions such as `.*`.

For malformed or very large inputs, these patterns could cause excessive regex backtracking. In the worst case, validation consumed enough memory or CPU for the process to be terminated with an out-of-memory error.

The affected expressions attempted to perform complete semantic validation of values such as domains, email addresses, URLs, durations, Kubernetes names, resource quantities, and IPv6 addresses using a single regex.

This level of strictness made the expressions difficult to audit and increased the risk of catastrophic backtracking.

## Decision

Replace the affected patterns with structurally simpler expressions that avoid nested ambiguous repetition.

The replacement expressions prioritize:

1. Predictable validation time.
2. Fully anchored matches.
3. Non-capturing groups where captured values are not needed.
4. Explicit character classes rather than broad `.` matches.
5. Simple structural validation rather than complete protocol-level validation.

Where exact semantic validation is required, it should be performed by a dedicated parser or a second validation step rather than by increasing regex complexity.

## Regex changes

### Annotation

**Previous**

```regex
^((.){1,253}\/)?(.){1,63}$
```

**Replacement**

```regex
^(?:[^/]{1,253}/)?[^/]{1,63}$
```

The broad `.` groups were replaced with explicit non-slash character classes. Capturing groups were replaced with non-capturing groups.

The replacement also makes the slash a structural separator instead of allowing slashes inside both components.

---

### Domain

**Previous**

```regex
^([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$
```

**Replacement**

```regex
^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$
```

The repeated nested domain-label groups were replaced with a bounded structural domain check.

The replacement ensures that the value starts and ends with an alphanumeric character, but it does not enforce every DNS-label rule.

---

### Duration

**Previous**

```regex
((([0-9]+)y)?(([0-9]+)w)?(([0-9]+)d)?(([0-9]+)h)?(([0-9]+)m)?(([0-9]+)s)?(([0-9]+)ms)?|0)
```

**Replacement**

```regex
^(?:0|(?:[0-9]+(?:ms|[ywdhms]))+)$
```

The chain of nested optional groups was replaced with a repeated number-and-unit token.

The replacement is fully anchored and safely validates the general duration structure.

It no longer enforces unit ordering or uniqueness. For example, values such as `1s2h` or `1h2h` may pass structural validation.

---

### Email

**Previous**

```regex
^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$
```

**Replacement**

```regex
^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$
```

The nested alternatives for quoted local parts, unquoted local parts, bracketed IP addresses, and repeated domain labels were removed.

The replacement performs a simple structural check for a local part, `@`, and a domain-like value.

Quoted local parts and bracketed IP address literals are no longer supported by the regex.

---

### Host and port

**Previous**

```regex
^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]):()([1-9]|[1-5]?[0-9]{2,4}|6[1-4][0-9]{3}|65[1-4][0-9]{2}|655[1-2][0-9]|6553[1-5])$
```

**Replacement**

```regex
^(?=.{3,259}$)[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?:(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$
```

The repeated nested host-label matching was replaced with a simpler host structure.

The empty capturing group before the port was removed.

The explicit range validation for ports from `1` through `65535` was retained.

---

### Kubernetes name

**Previous**

```regex
^[a-z]([_-a-z0-9]*[a-z0-9])+$
```

**Replacement**

```regex
^[a-z](?:[-_a-z0-9]{0,61}[a-z0-9])?$
```

The unbounded repeated group was replaced with a bounded optional tail.

The replacement allows a single lowercase character as a valid value, which the previous expression did not.

---

### ID name

**Previous**

```regex
^[a-z]([-a-z0-9]*[a-z0-9])+$
```

**Replacement**

```regex
^[a-z](?:[-a-z0-9]{0,61}[a-z0-9])?$
```

The unbounded internal repetition was replaced with a bounded optional tail.

The value must start with a lowercase letter and, when longer than one character, end with a lowercase letter or digit.

---

### CPU quantity

**Previous**

```regex
(^[1-9][0-9]*(?!<.*)$)|(^([0]|[1-9]+)\.[0-9]{1,3}(?!<.*)$)|(^[1-9][0-9]*m$)
```

**Replacement**

```regex
^(?:[1-9][0-9]*|(?:0|[1-9][0-9]*)\.[0-9]{1,3}|[1-9][0-9]*m)$
```

The anchors were moved around the complete alternation.

The negative lookaheads containing `.*` were removed because they were redundant once the expression was fully anchored.

Capturing groups were replaced with non-capturing groups.

---

### Memory quantity

**Previous**

```regex
^([0-9]+\.)?[0-9]+(E|P|T|G|M|K|Ei|Pi|Ti|Gi|Mi|Ki)$
```

**Replacement**

```regex
^(?:[0-9]+(?:\.[0-9]+)?)(?:Ei|Pi|Ti|Gi|Mi|Ki|E|P|T|G|M|K)$
```

The number section was simplified to an integer with an optional decimal fraction.

Capturing groups were replaced with non-capturing groups.

Two-character units are evaluated before one-character units.

The intended accepted value formats remain effectively unchanged.

---

### Repository URL

**Previous**

```regex
^(?:https://)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/[A-Za-z0-9_.-]+){2,}(?:\.git)?/?$
```

**Replacement**

```regex
^(?:https://)?[A-Za-z0-9.-]{1,253}/[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}(?:\.git)?/?$
```

The unbounded host and repeated path components were replaced with explicitly bounded structural components.

The replacement accepts a host followed by exactly two path components, representing an owner or group and a repository.

Nested repository paths such as `group/subgroup/repository` are no longer accepted by this pattern.

---

### Size

**Previous**

```regex
^([0-9]+\.)?[0-9]+(E|P|T|G||Ti|Gi)?$
```

**Replacement**

```regex
^(?:[0-9]+(?:\.[0-9]+)?)(?:Ti|Gi|E|P|T|G)?$
```

The decimal number structure was simplified.

The accidental empty alternative in the unit group was removed.

Capturing groups were replaced with non-capturing groups.

The intended supported values remain effectively unchanged.

---

### URL

**Previous**

```regex
^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)
```

**Replacement**

```regex
^https?://[A-Za-z0-9.-]{1,253}(?::[0-9]{1,5})?(?:/[A-Za-z0-9()@:%_+.~#?&/=-]*)?$
```

The replacement adds an end anchor so the complete input must match.

The host, optional port, and optional path are represented as separate structural sections.

The replacement permits internal hostnames such as `localhost` and `service-name`, whereas the previous expression required a dotted hostname.

Port syntax is checked, but the regex does not enforce a maximum numeric value of `65535`.

---

### Wildcard domain or IP address

**Previous**

```regex
^((\*\.)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?|([a-f0-9:]+:+)+[a-f0-9]+)$
```

**Replacement**

```regex
^(?:\*\.)?(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|(?:[A-Fa-f0-9]{0,4}:){2,7}[A-Fa-f0-9]{0,4})$
```

The repeated nested DNS-label expression was replaced with a simpler structural domain check.

The nested IPv6 expression:

```regex
([a-f0-9:]+:+)+
```

was removed because both the inner and outer groups could consume overlapping colon and hexadecimal sequences.

The replacement uses a bounded approximation of colon-separated IPv6 groups.

It is not intended to fully validate every valid IPv6 representation. Exact IPv6 validation should use an IP address parser.

## Consequences

### Positive

- Invalid inputs no longer cause excessive regex backtracking.
- Validation has more predictable CPU and memory usage.
- Patterns are easier to read, review, and maintain.
- All expressions validate the full value rather than accepting only a valid prefix.
- Unnecessary capturing groups and lookaheads were removed.

### Negative

- Some patterns are deliberately less strict than their predecessors.
- The domain, URL, email, and IPv6 patterns perform structural checks rather than complete standards-compliant validation.
- The duration expression no longer enforces unit ordering or uniqueness.
- The repository URL expression no longer permits arbitrarily nested repository groups.

## Alternatives considered

### Retain the existing expressions

Rejected because malformed input could trigger excessive backtracking and terminate the validation process.

### Use stricter replacement regexes

Rejected because increasing regex complexity would reintroduce ambiguity and make the expressions harder to audit for denial-of-service behavior.

### Replace all regex validation with parser libraries immediately

This is the preferred long-term direction for complex formats, but it is a larger change than required for the immediate reliability issue.

## Follow-up work

Where stricter validation is required, use dedicated validators after the safe structural check:

- Domain and hostname parser for DNS names.
- URL parser for URLs and repository URLs.
- Email validation library when full RFC support is required.
- IP address parser for IPv4 and IPv6.
- Kubernetes quantity parser for CPU, memory, and storage values.
- Duration parser that validates ordering, duplicate units, and supported ranges.

Tests should include:

- Valid representative values.
- Invalid representative values.
- Very long malformed inputs.
- Repeated separators, hyphens, dots, colons, and unit suffixes.
- Regression inputs that previously caused excessive resource consumption.
