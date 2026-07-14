# Maven Central publishing

[日本語](../ja/maven-central.md)

Publish `packages/java` to [Maven Central](https://central.sonatype.com/) via the
[Sonatype Central Publisher Portal](https://central.sonatype.org/publish/publish-portal-maven/).

Coordinates:

```text
io.github.orbit-id:orbit-id:<version>
```

Namespace `io.github.orbit-id` matches GitHub org [`orbit-id`](https://github.com/orbit-id).
Shared tagging: [Cross-registry versioning](cross-registry-versioning.md). Tracker: [#54](https://github.com/orbit-id/orbit-id/issues/54).

## One-time setup

1. Create an account at [central.sonatype.com](https://central.sonatype.com/).
2. **Claim namespace** `io.github.orbit-id` (GitHub org verification).
3. Generate a **User Token** (username + password pair for Maven `settings.xml`).
4. Create a long-lived **GPG** key for artifact signing; export the private key (ASCII armor).
5. In the GitHub repo **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `MAVEN_CENTRAL_USERNAME` | Central user-token username |
| `MAVEN_CENTRAL_PASSWORD` | Central user-token password |
| `MAVEN_GPG_PRIVATE_KEY` | Exported private key (ASCII) |
| `MAVEN_GPG_PASSPHRASE` | Key passphrase |

## Workflow

[`.github/workflows/publish-maven.yml`](../../.github/workflows/publish-maven.yml) runs on:

- tag push matching `v*` (same release cut as npm)
- manual **workflow_dispatch**

It runs `mvn -B -Prelease deploy` in `packages/java` with:

- `setup-java` writing a `settings.xml` server id `central`
- GPG signing via `maven-gpg-plugin`
- `central-publishing-maven-plugin` (`autoPublish`, wait until published)

If Central secrets are missing, the job fails with a clear message (no partial publish).

## Maintainer checklist

1. Bump `<version>` in `packages/java/pom.xml` when releasing (align with `vX.Y.Z` for coordinated cuts).
2. Merge to `main`; confirm `mvn -B test` (CI `test-java`).
3. Ensure the four secrets above are set.
4. Tag and push `vX.Y.Z` (see [Cross-registry versioning](cross-registry-versioning.md)).
5. Confirm **Publish Maven** workflow succeeded.
6. Check [Central search](https://central.sonatype.com/) for `io.github.orbit-id:orbit-id`.

Local dry-run (requires local GPG + `~/.m2/settings.xml` with server `central`):

```bash
cd packages/java
mvn -B -Prelease deploy
```

## Consumer snippet

```xml
<dependency>
  <groupId>io.github.orbit-id</groupId>
  <artifactId>orbit-id</artifactId>
  <version>1.0.0</version>
</dependency>
```

Java package name remains `com.github.orbitid` (unchanged from the in-repo layout).
