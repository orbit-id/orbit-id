# Orbit ID for Java

Java 17+ implementation of Orbit ID.

- **v1** (default): `com.github.orbitid` — stable 64-bit wire format
- **v2** (Draft): `com.github.orbitid.v2` — 128-bit layout (`v2.0.0-alpha`)

Coordinates after Maven Central publish ([#54](https://github.com/orbit-id/orbit-id/issues/54)):

```xml
<dependency>
  <groupId>io.github.orbit-id</groupId>
  <artifactId>orbit-id</artifactId>
  <version>1.0.0</version>
</dependency>
```

Until Central is live, use a local / CI build of this directory (`mvn install`).

```java
import com.github.orbitid.OrbitGenerator;
import com.github.orbitid.OrbitId;
import java.math.BigInteger;

// v1
OrbitGenerator v1 = new OrbitGenerator(7);
long v1Id = v1.generate(1);
String decimal = OrbitId.toDecimalString(v1Id);

// v2 Draft
com.github.orbitid.v2.OrbitGenerator v2 = new com.github.orbitid.v2.OrbitGenerator(7);
BigInteger v2Id = v2.generate(1);
String v2Decimal = com.github.orbitid.v2.OrbitId.toDecimalString(v2Id);
```

v1 IDs use `long` (unsigned 64-bit bit pattern). v2 IDs use `BigInteger` (unsigned 128-bit).

## API

### v1 (`com.github.orbitid`)

- `OrbitId`: encode, decode, parse, decimal/hex conversion, field accessors, and epoch conversion.
- `OrbitFields`: decoded `timestamp`, `type`, `node`, and `sequence`.
- `OrbitGenerator`: synchronized ID generation; type `0` is reserved and rejected.
- `GeneratorOptions`: configure an `OrbitClock`, a 5,000 ms rollback tolerance, sequence exhaustion
  (`WAIT` or `FAIL`), and an optional ownership callback.
- `OrbitError`: exception with a stable string code exposed by `getCode()`.

### v2 (`com.github.orbitid.v2`)

- Same operations as v1, plus `formatVersion` / `reserved` fields.
- Issued IDs use `FormatVersion = 1` and `Reserved = 0`.
- Shares root `OrbitClock`, `SequenceExhaustedMode`, `GeneratorOptions`, `GenerateDecision`, and
  `OrbitError` (including `INVALID_FORMAT_VERSION` / `INVALID_RESERVED`).

## Build / test

```sh
mvn test
```

Publishing (Central Portal, signing, CI secrets): see
[Maven Central publishing](../../docs/en/maven-central.md) and
[Cross-registry versioning](../../docs/en/cross-registry-versioning.md).
