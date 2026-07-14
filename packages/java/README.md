# Orbit ID for Java

Java 17+ implementation of the Orbit ID v1 format.

```xml
<dependency>
  <groupId>com.github.ponstream24</groupId>
  <artifactId>orbit-id</artifactId>
  <version>1.0.0</version>
</dependency>
```

```java
import com.github.ponstream24.orbitid.OrbitGenerator;
import com.github.ponstream24.orbitid.OrbitId;

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

Run the conformance suite from this directory:

```sh
mvn test
```
