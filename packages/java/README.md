# Orbit ID for Java

Java 11+ implementation of the Orbit ID v1 format (Java package `com.github.orbitid`).

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

OrbitGenerator generator = new OrbitGenerator(7);
long id = generator.generate(1);
String decimal = OrbitId.toDecimalString(id); // unsigned decimal text
```

`long` stores the ID's unsigned 64-bit bit pattern. Use `OrbitId.toDecimalString`,
`OrbitId.fromDecimalString`, and `OrbitId.toHexString` for wire representations.

## API

- `OrbitId`: encode, decode, parse, decimal/hex conversion, field accessors, and epoch conversion.
- `OrbitFields`: decoded `timestamp`, `type`, `node`, and `sequence`.
- `OrbitGenerator`: synchronized ID generation; type `0` is reserved and rejected.
- `GeneratorOptions`: configure an `OrbitClock`, a 5,000 ms rollback tolerance, sequence exhaustion
  (`WAIT` or `FAIL`), and an optional ownership callback.
- `OrbitError`: exception with a stable string code exposed by `getCode()`.

## Build / test

```sh
mvn test
```

Publishing (Central Portal, signing, CI secrets): see
[Maven Central publishing](../../docs/en/maven-central.md) and
[Cross-registry versioning](../../docs/en/cross-registry-versioning.md).
