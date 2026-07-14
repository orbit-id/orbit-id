package com.github.ponstream24.orbitid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConformanceTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path FIXTURES = Path.of("..", "..", "spec", "conformance");

    @Test
    void encodeDecodeFixtures() throws IOException {
        for (JsonNode testCase : fixture("encode-decode.v1.json").withArray("cases")) {
            long timestamp = Long.parseLong(testCase.get("timestamp").asText());
            int type = testCase.get("type").asInt();
            int node = testCase.get("node").asInt();
            int sequence = testCase.get("sequence").asInt();
            long id = OrbitId.encode(timestamp, type, node, sequence);

            assertEquals(testCase.get("idDecimal").asText(), OrbitId.toDecimalString(id));
            assertEquals(testCase.get("idHex").asText().toLowerCase(), OrbitId.toHexString(id));
            assertEquals(new OrbitFields(timestamp, type, node, sequence), OrbitId.decode(id));
            assertEquals(new OrbitFields(timestamp, type, node, sequence),
                    OrbitId.parse(testCase.get("idDecimal").asText()));
            assertEquals(id, OrbitId.fromDecimalString(testCase.get("idDecimal").asText()));
            assertTrue(OrbitId.isValid(id));
            assertTrue(OrbitId.isValid(testCase.get("idDecimal").asText()));
        }
    }

    @Test
    void rejectsNonCanonicalDecimals() throws IOException {
        for (JsonNode testCase : fixture("decode-reject.v1.json").withArray("cases")) {
            OrbitError error = assertThrows(OrbitError.class,
                    () -> OrbitId.fromDecimalString(testCase.get("input").asText()));
            assertEquals(OrbitError.INVALID_DECIMAL, error.getCode());
            assertFalse(OrbitId.isValid(testCase.get("input").asText()));
        }
        assertEquals(0L, OrbitId.fromDecimalString("0"));
        assertTrue(OrbitId.isValid("0"));
    }

    @Test
    void generatorFixtures() throws IOException {
        for (JsonNode testCase : fixture("generator.v1.json").withArray("cases")) {
            long now = Long.parseLong(testCase.get("nowTimestamp").asText());
            OrbitGenerator generator = new OrbitGenerator(GeneratorOptions.builder(testCase.get("node").asInt())
                    .clock(() -> now)
                    .clockRollbackToleranceMs(5_000)
                    .onSequenceExhausted(SequenceExhaustedMode.FAIL)
                    .build());
            JsonNode prior = testCase.get("prior");
            generator.restoreState(Long.parseLong(prior.get("lastTimestamp").asText()), prior.get("sequence").asInt());
            GenerateDecision decision = generator.decide(testCase.get("type").asInt(), now);
            JsonNode expected = testCase.get("expect");

            switch (expected.get("action").asText()) {
                case "issue":
                    assertEquals(new GenerateDecision.Issue(
                            Long.parseLong(expected.get("timestamp").asText()), expected.get("sequence").asInt()), decision);
                    break;
                case "wait":
                    assertEquals(new GenerateDecision.Wait(
                            Long.parseLong(expected.get("waitUntilTimestamp").asText())), decision);
                    break;
                case "error":
                    assertEquals(new GenerateDecision.Error(expected.get("error").asText()), decision);
                    break;
                case "wait_or_fail":
                    assertTrue(decision instanceof GenerateDecision.WaitNextMs
                            || decision.equals(new GenerateDecision.Error(expected.get("error").asText())));
                    break;
                default:
                    throw new AssertionError("unknown action");
            }
        }
    }

    @Test
    void generatorRejectsTypeZero() {
        OrbitGenerator generator = new OrbitGenerator(7);
        OrbitError error = assertThrows(OrbitError.class, () -> generator.generate(0));
        assertEquals(OrbitError.INVALID_TYPE, error.getCode());
    }

    private static JsonNode fixture(String fileName) throws IOException {
        return JSON.readTree(FIXTURES.resolve(fileName).toFile());
    }
}
