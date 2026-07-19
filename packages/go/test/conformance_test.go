package orbitid_test

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strconv"
	"testing"

	orbitid "github.com/orbit-id/go"
)

type encodeDecodeFixture struct {
	Cases []struct {
		ID, Timestamp, IDDecimal, IDHex string
		Type, Node, Sequence               int
	}
}

type rejectFixture struct {
	Cases []struct {
		ID, Input, Reason string
	}
}

type generatorFixture struct {
	Defaults struct {
		ClockRollbackToleranceMs string
	}
	Cases []struct {
		ID string
		Prior struct {
			LastTimestamp string
			Sequence      int
		}
		NowTimestamp string
		Type, Node   int
		Expect       struct {
			Action, Timestamp, WaitUntilTimestamp, Error string
			Sequence                                      int
			AllowedActions                                []string
		}
	}
}

func fixturePath(name string) string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "../../../spec/conformance", name)
}

func loadFixture(t *testing.T, name string, target any) {
	t.Helper()
	data, err := osReadFile(fixturePath(name))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, target); err != nil {
		t.Fatal(err)
	}
}

// osReadFile is assigned to keep fixture loading easy to replace in consumers'
// forked conformance suites.
var osReadFile = func(name string) ([]byte, error) {
	return os.ReadFile(name)
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
	loadFixture(t, "encode-decode.v1.json", &fixture)
	for _, c := range fixture.Cases {
		t.Run(c.ID, func(t *testing.T) {
			fields := orbitid.Fields{Timestamp: uintValue(t, c.Timestamp), Type: c.Type, Node: c.Node, Sequence: c.Sequence}
			id, err := orbitid.Encode(fields)
			if err != nil {
				t.Fatal(err)
			}
			if got := orbitid.ToDecimalString(id); got != c.IDDecimal {
				t.Fatalf("decimal = %q, want %q", got, c.IDDecimal)
			}
			if got := orbitid.ToHexString(id); got != c.IDHex {
				t.Fatalf("hex = %q, want %q", got, c.IDHex)
			}
			if got := orbitid.Decode(id); !reflect.DeepEqual(got, fields) {
				t.Fatalf("decode = %#v, want %#v", got, fields)
			}
			for _, input := range []any{c.IDDecimal, id} {
				got, err := orbitid.Parse(input)
				if err != nil || !reflect.DeepEqual(got, fields) {
					t.Fatalf("parse(%v) = %#v, %v; want %#v", input, got, err, fields)
				}
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
			if !orbitid.IsValid(c.IDDecimal) || !orbitid.IsValid(id) {
				t.Fatal("valid conformance ID rejected")
			}
		})
	}
}

func TestDecimalRejectConformance(t *testing.T) {
	var fixture rejectFixture
	loadFixture(t, "decode-reject.v1.json", &fixture)
	for _, c := range fixture.Cases {
		t.Run(c.ID, func(t *testing.T) {
			_, err := orbitid.FromDecimalString(c.Input)
			var orbitErr *orbitid.Error
			if !errors.As(err, &orbitErr) || orbitErr.Code != orbitid.InvalidDecimal {
				t.Fatalf("error = %v, want INVALID_DECIMAL", err)
			}
			if _, err := orbitid.Parse(c.Input); err == nil || orbitid.IsValid(c.Input) {
				t.Fatal("invalid decimal accepted")
			}
		})
	}
	if id, err := orbitid.FromDecimalString("0"); err != nil || id != 0 || !orbitid.IsValid("0") {
		t.Fatalf("canonical zero = %d, %v", id, err)
	}
}

type fixedClock struct{ now int64 }

func (c fixedClock) CurrentOrbitTimestampMs() int64 { return c.now }

func TestGeneratorConformance(t *testing.T) {
	var fixture generatorFixture
	loadFixture(t, "generator.v1.json", &fixture)
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
	if err := generator.RestoreState(1000, 1023); err != nil {
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
	if generator.GetLastTimestamp() != 0 || generator.GetSequence() != 0 {
		t.Fatalf("initial state = %d/%d", generator.GetLastTimestamp(), generator.GetSequence())
	}
	id, err := generator.Generate(1)
	if err != nil || id == 0 {
		t.Fatalf("generate = %d, %v", id, err)
	}
	if generator.GetLastTimestamp() == 0 {
		t.Fatal("expected last timestamp to update")
	}

	waitClock := &tickingClock{values: []int64{1000, 1000, 1001, 1001}}
	waiter, err := orbitid.NewGenerator(orbitid.GeneratorOptions{
		Node: 7, Clock: waitClock, OnSequenceExhausted: orbitid.SequenceExhaustedWait,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := waiter.RestoreState(1000, 1023); err != nil {
		t.Fatal(err)
	}
	if _, err := waiter.Generate(1); err != nil {
		t.Fatalf("wait generate: %v", err)
	}
	if waiter.GetLastTimestamp() != 1001 {
		t.Fatalf("wait last = %d", waiter.GetLastTimestamp())
	}

	if _, err := orbitid.Encode(orbitid.Fields{Timestamp: orbitid.MaxTimestamp + 1, Type: 1, Node: 1, Sequence: 0}); err == nil {
		t.Fatal("expected timestamp overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{Timestamp: 1, Type: 99, Node: 1, Sequence: 0}); err == nil {
		t.Fatal("expected type overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{Timestamp: 1, Type: 1, Node: 999, Sequence: 0}); err == nil {
		t.Fatal("expected node overflow")
	}
	if _, err := orbitid.Encode(orbitid.Fields{Timestamp: 1, Type: 1, Node: 1, Sequence: 9999}); err == nil {
		t.Fatal("expected sequence overflow")
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
