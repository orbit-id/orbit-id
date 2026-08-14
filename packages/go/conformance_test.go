package orbitid_test

import (
	"encoding/json"
	"errors"
	"math/big"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strconv"
	"testing"

	orbitid "github.com/orbit-id/go/v2"
)

type encodeDecodeFixture struct {
	Cases []struct {
		ID, Timestamp, IDDecimal, IDHex string
		FormatVersion, Type, Node       int
		Sequence, Region, Tenant        int
		Reserved                        int
	}
}

type rejectFixture struct {
	Cases []struct {
		ID, Input, Reason, Code string
	}
}

type generatorFixture struct {
	Defaults struct {
		ClockRollbackToleranceMs string
	}
	Cases []struct {
		ID    string
		Prior struct {
			LastTimestamp string
			Sequence      int
		}
		NowTimestamp string
		Type, Node   int
		Expect       struct {
			Action, Timestamp, WaitUntilTimestamp, Error string
			Sequence                                     int
			AllowedActions                               []string
		}
	}
}

func fixturePath(name string) string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "../../spec/conformance", name)
}

func loadFixture(t *testing.T, name string, target any) {
	t.Helper()
	data, err := os.ReadFile(fixturePath(name))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, target); err != nil {
		t.Fatal(err)
	}
}

func uintValue(t *testing.T, value string) uint64 {
	t.Helper()
	result, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

func TestEncodeDecodeConformance(t *testing.T) {
	var fixture encodeDecodeFixture
	loadFixture(t, "encode-decode.v2.json", &fixture)
	for _, c := range fixture.Cases {
		t.Run(c.ID, func(t *testing.T) {
			fields := orbitid.Fields{
				FormatVersion: c.FormatVersion, Timestamp: uintValue(t, c.Timestamp),
				Type: c.Type, Node: c.Node, Sequence: c.Sequence,
				Region: c.Region, Tenant: c.Tenant, Reserved: uint32(c.Reserved),
			}
			id, err := orbitid.Encode(fields)
			if err != nil {
				t.Fatal(err)
			}
			decimal, err := orbitid.ToDecimalString(id)
			if err != nil || decimal != c.IDDecimal {
				t.Fatalf("decimal = %q, %v, want %q", decimal, err, c.IDDecimal)
			}
			hex, err := orbitid.ToHexString(id)
			if err != nil || hex != c.IDHex {
				t.Fatalf("hex = %q, %v, want %q", hex, err, c.IDHex)
			}
			b64, err := orbitid.ToBase64UrlString(id)
			if err != nil {
				t.Fatal(err)
			}
			roundTrip, err := orbitid.FromBase64UrlString(b64)
			if err != nil || roundTrip.Cmp(id) != 0 {
				t.Fatalf("base64url round-trip = %v, %v", roundTrip, err)
			}
			got, err := orbitid.Decode(id)
			if err != nil || !reflect.DeepEqual(got, fields) {
				t.Fatalf("decode = %#v, %v, want %#v", got, err, fields)
			}
			for _, input := range []any{c.IDDecimal, id} {
				got, err := orbitid.Parse(input)
				if err != nil || !reflect.DeepEqual(got, fields) {
					t.Fatalf("parse(%v) = %#v, %v; want %#v", input, got, err, fields)
				}
			}
			if got, _ := orbitid.GetFormatVersion(c.IDDecimal); got != fields.FormatVersion {
				t.Fatalf("formatVersion = %d, want %d", got, fields.FormatVersion)
			}
			if got, _ := orbitid.GetTimestamp(c.IDDecimal); got != fields.Timestamp {
				t.Fatalf("timestamp = %d, want %d", got, fields.Timestamp)
			}
			if got, _ := orbitid.GetType(id); got != fields.Type {
				t.Fatalf("type = %d, want %d", got, fields.Type)
			}
			if got, _ := orbitid.GetNode(c.IDDecimal); got != fields.Node {
				t.Fatalf("node = %d, want %d", got, fields.Node)
			}
			if got, _ := orbitid.GetSequence(id); got != fields.Sequence {
				t.Fatalf("sequence = %d, want %d", got, fields.Sequence)
			}
			if got, _ := orbitid.GetRegion(id); got != fields.Region {
				t.Fatalf("region = %d, want %d", got, fields.Region)
			}
			if got, _ := orbitid.GetTenant(id); got != fields.Tenant {
				t.Fatalf("tenant = %d, want %d", got, fields.Tenant)
			}
			if got, _ := orbitid.GetReserved(id); got != fields.Reserved {
				t.Fatalf("reserved = %d, want %d", got, fields.Reserved)
			}
			if !orbitid.IsValid(c.IDDecimal) || !orbitid.IsValid(id) {
				t.Fatal("valid conformance ID rejected")
			}
		})
	}
}

func TestDecimalRejectConformance(t *testing.T) {
	var fixture rejectFixture
	loadFixture(t, "decode-reject.v2.json", &fixture)
	for _, c := range fixture.Cases {
		t.Run(c.ID, func(t *testing.T) {
			expectedCode := orbitid.InvalidDecimal
			if c.Code != "" {
				expectedCode = orbitid.ErrorCode(c.Code)
			}
			if expectedCode == orbitid.InvalidDecimal {
				_, err := orbitid.FromDecimalString(c.Input)
				var orbitErr *orbitid.Error
				if !errors.As(err, &orbitErr) || orbitErr.Code != orbitid.InvalidDecimal {
					t.Fatalf("error = %v, want INVALID_DECIMAL", err)
				}
			} else {
				value, err := orbitid.FromDecimalString(c.Input)
				if err != nil || value.Sign() < 0 {
					t.Fatalf("FromDecimalString = %v, %v", value, err)
				}
				_, err = orbitid.Parse(c.Input)
				var orbitErr *orbitid.Error
				if !errors.As(err, &orbitErr) || orbitErr.Code != expectedCode {
					t.Fatalf("parse error = %v, want %s", err, expectedCode)
				}
			}
			if _, err := orbitid.Parse(c.Input); err == nil || orbitid.IsValid(c.Input) {
				t.Fatal("invalid input accepted")
			}
		})
	}
	// "0" is a canonical decimal string, but formatVersion 0 is reserved, so
	// it is rejected as a v2 id (unlike v1, where every 64-bit pattern decodes).
	zero, err := orbitid.FromDecimalString("0")
	if err != nil || zero.Sign() != 0 {
		t.Fatalf("FromDecimalString(0) = %v, %v", zero, err)
	}
	if orbitid.IsValid("0") {
		t.Fatal("expected formatVersion 0 to be rejected as a v2 id")
	}
	if _, err := orbitid.Decode(zero); err == nil {
		t.Fatal("expected Decode(0) to be rejected (reserved formatVersion)")
	}
}

func TestDecodeRejectsUnknownFormatVersionAndReserved(t *testing.T) {
	fields := orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: 1, Sequence: 0, Region: 0, Tenant: 0, Reserved: 0}
	id, err := orbitid.Encode(fields)
	if err != nil {
		t.Fatal(err)
	}

	unknownVersion := new(big.Int).Set(id)
	unknownVersion.Xor(unknownVersion, new(big.Int).Lsh(big.NewInt(1), orbitid.FormatVersionShift))
	if _, err := orbitid.Decode(unknownVersion); err == nil {
		t.Fatal("expected unknown formatVersion to be rejected")
	} else {
		var orbitErr *orbitid.Error
		if !errors.As(err, &orbitErr) || orbitErr.Code != orbitid.InvalidFormatVersion {
			t.Fatalf("error = %v, want INVALID_FORMAT_VERSION", err)
		}
	}

	nonZeroReserved := new(big.Int).Or(id, big.NewInt(1))
	if _, err := orbitid.Decode(nonZeroReserved); err == nil {
		t.Fatal("expected non-zero reserved to be rejected")
	} else {
		var orbitErr *orbitid.Error
		if !errors.As(err, &orbitErr) || orbitErr.Code != orbitid.InvalidReserved {
			t.Fatalf("error = %v, want INVALID_RESERVED", err)
		}
	}

	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 0, Timestamp: 1, Type: 1, Node: 1, Sequence: 0}); err == nil {
		t.Fatal("expected formatVersion 0 to be rejected on encode")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: 1, Sequence: 0, Reserved: 1}); err == nil {
		t.Fatal("expected non-zero reserved to be rejected on encode")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: 1, Sequence: 0, Region: 99}); err == nil {
		t.Fatal("expected region overflow to be rejected on encode")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: 1, Sequence: 0, Tenant: 99_999}); err == nil {
		t.Fatal("expected tenant overflow to be rejected on encode")
	}

	if _, err := orbitid.Decode(nil); err == nil {
		t.Fatal("expected nil id to be rejected")
	}
	negative := big.NewInt(-1)
	if _, err := orbitid.Decode(negative); err == nil {
		t.Fatal("expected negative id to be rejected")
	}
	overflow := new(big.Int).Add(new(big.Int).Lsh(big.NewInt(1), 128), big.NewInt(1))
	if _, err := orbitid.Decode(overflow); err == nil {
		t.Fatal("expected overflow id to be rejected")
	}
	if _, err := orbitid.ToDecimalString(negative); err == nil {
		t.Fatal("expected ToDecimalString to reject negative id")
	}
	if _, err := orbitid.ToHexString(negative); err == nil {
		t.Fatal("expected ToHexString to reject negative id")
	}
	if _, err := orbitid.Parse(42); err == nil {
		t.Fatal("expected unsupported input type to be rejected")
	}
}

type fixedClock struct{ now int64 }

func (c fixedClock) CurrentOrbitTimestampMs() int64 { return c.now }

func TestGeneratorConformance(t *testing.T) {
	var fixture generatorFixture
	loadFixture(t, "generator.v2.json", &fixture)
	tolerance := int64(uintValue(t, fixture.Defaults.ClockRollbackToleranceMs))
	for _, c := range fixture.Cases {
		t.Run(c.ID, func(t *testing.T) {
			generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
				Node: c.Node, Clock: fixedClock{now: int64(uintValue(t, c.NowTimestamp))},
				ClockRollbackToleranceMs: tolerance, OnSequenceExhausted: orbitid.SequenceExhaustedFail,
			})
			if err != nil {
				t.Fatal(err)
			}
			if err := generator.RestoreState(uintValue(t, c.Prior.LastTimestamp), c.Prior.Sequence); err != nil {
				t.Fatal(err)
			}
			decision := generator.Decide(c.Type, int64(uintValue(t, c.NowTimestamp)))
			switch c.Expect.Action {
			case "issue":
				if decision.Action != orbitid.DecisionIssue || decision.Timestamp != uintValue(t, c.Expect.Timestamp) || decision.Sequence != c.Expect.Sequence {
					t.Fatalf("decision = %#v", decision)
				}
			case "wait":
				if decision.Action != orbitid.DecisionWait || decision.WaitUntilTimestamp != uintValue(t, c.Expect.WaitUntilTimestamp) {
					t.Fatalf("decision = %#v", decision)
				}
			case "wait_or_fail":
				if decision.Action != orbitid.DecisionError || decision.Error != orbitid.SequenceExhausted {
					t.Fatalf("decision = %#v", decision)
				}
			case "error":
				if decision.Action != orbitid.DecisionError || string(decision.Error) != c.Expect.Error {
					t.Fatalf("decision = %#v", decision)
				}
			}
		})
	}
}

func TestGeneratorWaitModeAndReservedType(t *testing.T) {
	generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 7, Clock: fixedClock{now: 1000}, OnSequenceExhausted: orbitid.SequenceExhaustedWait,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := generator.RestoreState(1000, orbitid.MaxSequence); err != nil {
		t.Fatal(err)
	}
	decision := generator.Decide(1, 1000)
	if decision.Action != orbitid.DecisionWaitNextMs || decision.FromTimestamp != 1000 {
		t.Fatalf("decision = %#v", decision)
	}
	if _, err := generator.Generate(0); err == nil {
		t.Fatal("Generate(0) accepted")
	}
}

func TestGeneratorGenerateAndHelpers(t *testing.T) {
	clock := &tickingClock{values: []int64{1000, 1000, 1001, 1001}}
	generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 7, Clock: clock, OnSequenceExhausted: orbitid.SequenceExhaustedWait,
	})
	if err != nil {
		t.Fatal(err)
	}
	if generator.Node() != 7 {
		t.Fatalf("node = %d", generator.Node())
	}
	if generator.Region() != 0 || generator.Tenant() != 0 {
		t.Fatalf("region/tenant = %d/%d", generator.Region(), generator.Tenant())
	}
	if generator.GetLastTimestamp() != 0 || generator.GetSequence() != 0 {
		t.Fatalf("initial state = %d/%d", generator.GetLastTimestamp(), generator.GetSequence())
	}
	id, err := generator.Generate(1)
	if err != nil || id.Sign() == 0 {
		t.Fatalf("generate = %v, %v", id, err)
	}
	if generator.GetLastTimestamp() == 0 {
		t.Fatal("expected last timestamp to update")
	}
	if region, _ := orbitid.GetRegion(id); region != 0 {
		t.Fatalf("region = %d", region)
	}
	if tenant, _ := orbitid.GetTenant(id); tenant != 0 {
		t.Fatalf("tenant = %d", tenant)
	}

	configured, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 1, Region: 3, Tenant: 1000, Clock: fixedClock{now: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	configuredID, err := configured.Generate(1)
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := orbitid.GetRegion(configuredID); got != 3 {
		t.Fatalf("region = %d, want 3", got)
	}
	if got, _ := orbitid.GetTenant(configuredID); got != 1000 {
		t.Fatalf("tenant = %d, want 1000", got)
	}
	if _, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 1, Region: 99}); err == nil {
		t.Fatal("expected region overflow")
	}
	if _, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 1, Tenant: 99_999}); err == nil {
		t.Fatal("expected tenant overflow")
	}

	waitClock := &tickingClock{values: []int64{1000, 1000, 1001, 1001}}
	waiter, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 7, Clock: waitClock, OnSequenceExhausted: orbitid.SequenceExhaustedWait,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := waiter.RestoreState(1000, orbitid.MaxSequence); err != nil {
		t.Fatal(err)
	}
	if _, err := waiter.Generate(1); err != nil {
		t.Fatalf("wait generate: %v", err)
	}
	if waiter.GetLastTimestamp() != 1001 {
		t.Fatalf("wait last = %d", waiter.GetLastTimestamp())
	}

	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: orbitid.MaxTimestamp + 1, Type: 1, Node: 1, Sequence: 0}); err == nil {
		t.Fatal("expected timestamp overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: orbitid.MaxType + 1, Node: 1, Sequence: 0}); err == nil {
		t.Fatal("expected type overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: orbitid.MaxNode + 1, Sequence: 0}); err == nil {
		t.Fatal("expected node overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{FormatVersion: 1, Timestamp: 1, Type: 1, Node: 1, Sequence: orbitid.MaxSequence + 1}); err == nil {
		t.Fatal("expected sequence overflow")
	}
	if err := waiter.RestoreState(orbitid.MaxTimestamp+1, 0); err == nil {
		t.Fatal("expected RestoreState timestamp overflow")
	}
	if err := waiter.RestoreState(0, orbitid.MaxSequence+1); err == nil {
		t.Fatal("expected RestoreState sequence overflow")
	}
	if _, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: orbitid.MaxNode + 1}); err == nil {
		t.Fatal("expected NewGenerator node overflow")
	}
	if _, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 1, ClockRollbackToleranceMs: -1}); err == nil {
		t.Fatal("expected negative tolerance rejected")
	}
	if _, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 1, OnSequenceExhausted: "bogus"}); err == nil {
		t.Fatal("expected invalid sequence exhaustion mode rejected")
	}

	unix := orbitid.ToUnixTimeMs(0)
	if orbitid.FromUnixTimeMs(int64(unix)) != 0 {
		t.Fatal("unix roundtrip failed")
	}
	_ = orbitid.SystemClock().CurrentOrbitTimestampMs()

	lost, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 1, Clock: fixedClock{now: 5}, ConfirmOwnership: func() bool { return false },
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := lost.Generate(1); err == nil {
		t.Fatal("expected ownership loss")
	}
}

type tickingClock struct {
	values []int64
	index  int
}

func (c *tickingClock) CurrentOrbitTimestampMs() int64 {
	if c.index >= len(c.values) {
		return c.values[len(c.values)-1]
	}
	v := c.values[c.index]
	c.index++
	return v
}
