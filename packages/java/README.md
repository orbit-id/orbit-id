# Orbit ID for Java

Java 17+ implementation of Orbit ID.

- **v2** (default): `com.github.orbitid` — Stable 128-bit wire format
- **v1**: `com.github.orbitid.v1` — stable 64-bit wire format

Coordinates after Maven Central publish ([#54](https://github.com/orbit-id/orbit-id/issues/54)):

```xml
<dependency>
  <groupId>io.github.orbit-id</groupId>
  <artifactId>orbit-id</artifactId>
  <version>1.1.1</version>
</dependency>
```

Until Central is live, use a local / CI build of this directory (`mvn install`).

```java
import com.github.orbitid.OrbitGenerator;
import com.github.orbitid.OrbitId;
import java.math.BigInteger;

// v2 (default)
OrbitGenerator v2 = new OrbitGenerator(7);
BigInteger v2Id = v2.generate(1);
String v2Decimal = OrbitId.toDecimalString(v2Id);

// v1
com.github.orbitid.v1.OrbitGenerator v1Gen = new com.github.orbitid.v1.OrbitGenerator(7);
long v1Id = v1Gen.generate(1);
String v1Decimal = com.github.orbitid.v1.OrbitId.toDecimalString(v1Id);
```

v2 IDs use `BigInteger` (unsigned 128-bit). v1 IDs use `long` (unsigned 64-bit bit pattern).

## API

### v2 (`com.github.orbitid`)

- `OrbitId`: encode, decode, parse, decimal/hex conversion, field accessors, and epoch conversion.
- `OrbitFields`: decoded `formatVersion`, `timestamp`, `type`, `node`, `sequence`, `region`,
  `tenant`, and `reserved`.
- `OrbitGenerator`: synchronized ID generation; type `0` is reserved and rejected.
- `GeneratorOptions`: configure an `OrbitClock`, rollback tolerance, sequence exhaustion
  (`WAIT` or `FAIL`), optional ownership callback, and region/tenant.
- `OrbitError`: exception with a stable string code exposed by `getCode()` (includes
  `INVALID_FORMAT_VERSION` / `INVALID_REGION` / `INVALID_TENANT` / `INVALID_RESERVED`).

### v1 (`com.github.orbitid.v1`)

- Same operations for the 64-bit wire format (`timestamp` / `type` / `node` / `sequence`).
- Shares root `OrbitClock`, `SequenceExhaustedMode`, `GeneratorOptions`, `GenerateDecision`, and
  `OrbitError`.

## Build / test

```sh
mvn test
```

Publishing (Central Portal, signing, CI secrets): see
[Maven Central publishing](../../docs/en/maven-central.md) and
[Cross-registry versioning](../../docs/en/cross-registry-versioning.md).
