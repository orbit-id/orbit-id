// Package orbitid implements the Orbit ID v1 unsigned 64-bit format.
package orbitid

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	OrbitEpochUnixMs                 int64  = 1767225600000
	TimestampBits                           = 41
	TypeBits                                = 6
	NodeBits                                = 7
	SequenceBits                            = 10
	TimestampShift                          = 23
	TypeShift                               = 17
	NodeShift                               = 10
	MaxTimestamp                     uint64 = (1 << TimestampBits) - 1
	MaxType                            int   = (1 << TypeBits) - 1
	MaxNode                            int   = (1 << NodeBits) - 1
	MaxSequence                        int   = (1 << SequenceBits) - 1
	DefaultClockRollbackToleranceMs  int64 = 5000
)

// ErrorCode is a stable, machine-readable Orbit error code.
type ErrorCode string

const (
	InvalidType       ErrorCode = "INVALID_TYPE"
	InvalidNode       ErrorCode = "INVALID_NODE"
	InvalidSequence   ErrorCode = "INVALID_SEQUENCE"
	InvalidTimestamp  ErrorCode = "INVALID_TIMESTAMP"
	InvalidDecimal    ErrorCode = "INVALID_DECIMAL"
	ClockRollback     ErrorCode = "CLOCK_ROLLBACK"
	SequenceExhausted ErrorCode = "SEQUENCE_EXHAUSTED"
	NodeOwnershipLost ErrorCode = "NODE_OWNERSHIP_LOST"
)

// Error is returned for invalid Orbit input or failed generation.
type Error struct {
	Code ErrorCode
	Message string
}

func (e *Error) Error() string {
	return string(e.Code) + ": " + e.Message
}

func orbitError(code ErrorCode, format string, args ...any) error {
	return &Error{Code: code, Message: fmt.Sprintf(format, args...)}
}

// Fields are the decoded Orbit ID fields. Timestamp is milliseconds since
// OrbitEpochUnixMs.
type Fields struct {
	Timestamp uint64
	Type      int
	Node      int
	Sequence  int
}

// Encode validates fields and packs them into an unsigned 64-bit Orbit ID.
func Encode(fields Fields) (uint64, error) {
	if fields.Timestamp > MaxTimestamp {
		return 0, orbitError(InvalidTimestamp, "timestamp out of range: %d", fields.Timestamp)
	}
	if fields.Type < 0 || fields.Type > MaxType {
		return 0, orbitError(InvalidType, "type out of range: %d", fields.Type)
	}
	if fields.Node < 0 || fields.Node > MaxNode {
		return 0, orbitError(InvalidNode, "node out of range: %d", fields.Node)
	}
	if fields.Sequence < 0 || fields.Sequence > MaxSequence {
		return 0, orbitError(InvalidSequence, "sequence out of range: %d", fields.Sequence)
	}
	return fields.Timestamp<<TimestampShift |
		uint64(fields.Type)<<TypeShift |
		uint64(fields.Node)<<NodeShift |
		uint64(fields.Sequence), nil
}

// Decode unpacks an unsigned 64-bit Orbit ID.
func Decode(id uint64) Fields {
	return Fields{
		Timestamp: (id >> TimestampShift) & MaxTimestamp,
		Type:      int((id >> TypeShift) & uint64(MaxType)),
		Node:      int((id >> NodeShift) & uint64(MaxNode)),
		Sequence:  int(id & uint64(MaxSequence)),
	}
}

// Parse accepts a uint64 Orbit ID or canonical decimal string and decodes it.
func Parse(id any) (Fields, error) {
	value, err := parseID(id)
	if err != nil {
		return Fields{}, err
	}
	return Decode(value), nil
}

func parseID(id any) (uint64, error) {
	switch value := id.(type) {
	case uint64:
		return value, nil
	case string:
		return FromDecimalString(value)
	case uint:
		return uint64(value), nil
	case uint32:
		return uint64(value), nil
	case uint16:
		return uint64(value), nil
	case uint8:
		return uint64(value), nil
	case int:
		if value >= 0 {
			return uint64(value), nil
		}
	case int64:
		if value >= 0 {
			return uint64(value), nil
		}
	case int32:
		if value >= 0 {
			return uint64(value), nil
		}
	}
	return 0, orbitError(InvalidDecimal, "id must be an unsigned integer or canonical decimal string")
}

// GetTimestamp returns milliseconds since Orbit Epoch.
func GetTimestamp(id any) (uint64, error) {
	fields, err := Parse(id)
	return fields.Timestamp, err
}

func GetType(id any) (int, error) {
	fields, err := Parse(id)
	return fields.Type, err
}

func GetNode(id any) (int, error) {
	fields, err := Parse(id)
	return fields.Node, err
}

func GetSequence(id any) (int, error) {
	fields, err := Parse(id)
	return fields.Sequence, err
}

// IsValid reports syntactic validity only; it does not prove an ID was issued.
func IsValid(id any) bool {
	_, err := parseID(id)
	return err == nil
}

func ToDecimalString(id uint64) string {
	return strconv.FormatUint(id, 10)
}

// FromDecimalString accepts only canonical, unsigned base-10 uint64 strings.
func FromDecimalString(input string) (uint64, error) {
	if input == "" {
		return 0, orbitError(InvalidDecimal, "empty decimal string")
	}
	if strings.HasPrefix(input, "+") || strings.HasPrefix(input, "-") ||
		strings.TrimSpace(input) != input || strings.Contains(input, ".") ||
		strings.Contains(strings.ToLower(input), "x") {
		return 0, orbitError(InvalidDecimal, "non-canonical decimal string")
	}
	if len(input) > 1 && input[0] == '0' {
		return 0, orbitError(InvalidDecimal, "leading zeros are not canonical")
	}
	for _, r := range input {
		if r < '0' || r > '9' {
			return 0, orbitError(InvalidDecimal, "non-canonical decimal string")
		}
	}
	value, err := strconv.ParseUint(input, 10, 64)
	if err != nil {
		return 0, orbitError(InvalidDecimal, "decimal value outside unsigned 64-bit range")
	}
	return value, nil
}

func ToHexString(id uint64) string {
	return fmt.Sprintf("0x%016x", id)
}

func ToUnixTimeMs(timestamp uint64) uint64 {
	return timestamp + uint64(OrbitEpochUnixMs)
}

// FromUnixTimeMs converts Unix milliseconds to an Orbit timestamp. A negative
// result is invalid for encoding and will be rejected by Generator/Encode.
func FromUnixTimeMs(unixMs int64) int64 {
	return unixMs - OrbitEpochUnixMs
}

// Clock supplies milliseconds since Orbit Epoch. It is injectable for tests.
type Clock interface {
	CurrentOrbitTimestampMs() int64
}

type systemClock struct{}

func (systemClock) CurrentOrbitTimestampMs() int64 {
	return time.Now().UnixMilli() - OrbitEpochUnixMs
}

// SystemClock returns the production wall-clock Orbit timestamp source.
func SystemClock() Clock { return systemClock{} }

type SequenceExhaustedMode string

const (
	SequenceExhaustedWait SequenceExhaustedMode = "wait"
	SequenceExhaustedFail SequenceExhaustedMode = "fail"
)

type GeneratorOptions struct {
	Node                     int
	Clock                    Clock
	ClockRollbackToleranceMs int64
	OnSequenceExhausted      SequenceExhaustedMode
	// ConfirmOwnership may fail closed when a node lease is lost.
	ConfirmOwnership func() bool
}

type DecisionAction string

const (
	DecisionIssue      DecisionAction = "issue"
	DecisionWait       DecisionAction = "wait"
	DecisionWaitNextMs DecisionAction = "wait_next_ms"
	DecisionError      DecisionAction = "error"
)

// GenerateDecision describes the next safe generator action.
type GenerateDecision struct {
	Action             DecisionAction
	Timestamp          uint64
	Sequence           int
	WaitUntilTimestamp uint64
	FromTimestamp      uint64
	Error              ErrorCode
}

// Generator issues Orbit IDs for one exclusively assigned node.
type Generator struct {
	node                     int
	clock                    Clock
	clockRollbackToleranceMs int64
	onSequenceExhausted      SequenceExhaustedMode
	confirmOwnership         func() bool
	lastTimestamp            int64
	sequence                 int
	mu                       sync.Mutex
}

func NewGenerator(options GeneratorOptions) (*Generator, error) {
	if options.Node < 0 || options.Node > MaxNode {
		return nil, orbitError(InvalidNode, "node out of range: %d", options.Node)
	}
	clock := options.Clock
	if clock == nil {
		clock = SystemClock()
	}
	tolerance := options.ClockRollbackToleranceMs
	if tolerance == 0 {
		tolerance = DefaultClockRollbackToleranceMs
	}
	if tolerance < 0 {
		return nil, orbitError(InvalidTimestamp, "clock rollback tolerance must be non-negative")
	}
	mode := options.OnSequenceExhausted
	if mode == "" {
		mode = SequenceExhaustedWait
	}
	if mode != SequenceExhaustedWait && mode != SequenceExhaustedFail {
		return nil, orbitError(InvalidSequence, "invalid sequence exhaustion mode: %s", mode)
	}
	return &Generator{
		node: options.Node, clock: clock, clockRollbackToleranceMs: tolerance,
		onSequenceExhausted: mode, confirmOwnership: options.ConfirmOwnership,
		lastTimestamp: -1,
	}, nil
}

func (g *Generator) Node() int { return g.node }

func (g *Generator) GetLastTimestamp() uint64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.lastTimestamp < 0 {
		return 0
	}
	return uint64(g.lastTimestamp)
}

func (g *Generator) GetSequence() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.sequence
}

// RestoreState seeds persisted generator state for restart recovery or tests.
func (g *Generator) RestoreState(lastTimestamp uint64, sequence int) error {
	if lastTimestamp > MaxTimestamp {
		return orbitError(InvalidTimestamp, "timestamp out of range: %d", lastTimestamp)
	}
	if sequence < 0 || sequence > MaxSequence {
		return orbitError(InvalidSequence, "sequence out of range: %d", sequence)
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	g.lastTimestamp = int64(lastTimestamp)
	g.sequence = sequence
	return nil
}

// Decide evaluates a generation request without changing state.
func (g *Generator) Decide(typ int, nowTimestamp ...int64) GenerateDecision {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.decideLocked(typ, nowTimestamp...)
}

func (g *Generator) decideLocked(typ int, nowTimestamp ...int64) GenerateDecision {
	if g.confirmOwnership != nil && !g.confirmOwnership() {
		return GenerateDecision{Action: DecisionError, Error: NodeOwnershipLost}
	}
	if typ < 1 || typ > MaxType {
		return GenerateDecision{Action: DecisionError, Error: InvalidType}
	}
	now := g.clock.CurrentOrbitTimestampMs()
	if len(nowTimestamp) > 0 {
		now = nowTimestamp[0]
	}
	if now < 0 || uint64(now) > MaxTimestamp {
		return GenerateDecision{Action: DecisionError, Error: InvalidTimestamp}
	}
	if g.lastTimestamp < 0 {
		return GenerateDecision{Action: DecisionIssue, Timestamp: uint64(now), Sequence: 0}
	}
	if now < g.lastTimestamp {
		if g.lastTimestamp-now <= g.clockRollbackToleranceMs {
			return GenerateDecision{Action: DecisionWait, WaitUntilTimestamp: uint64(g.lastTimestamp)}
		}
		return GenerateDecision{Action: DecisionError, Error: ClockRollback}
	}
	if now == g.lastTimestamp {
		if g.sequence >= MaxSequence {
			if g.onSequenceExhausted == SequenceExhaustedFail {
				return GenerateDecision{Action: DecisionError, Error: SequenceExhausted}
			}
			return GenerateDecision{Action: DecisionWaitNextMs, FromTimestamp: uint64(g.lastTimestamp)}
		}
		return GenerateDecision{Action: DecisionIssue, Timestamp: uint64(now), Sequence: g.sequence + 1}
	}
	return GenerateDecision{Action: DecisionIssue, Timestamp: uint64(now), Sequence: 0}
}

// Generate serializes state changes and returns a newly issued ID. Type 0 is
// reserved and is rejected.
func (g *Generator) Generate(typ int) (uint64, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	for {
		decision := g.decideLocked(typ)
		switch decision.Action {
		case DecisionIssue:
			id, err := Encode(Fields{Timestamp: decision.Timestamp, Type: typ, Node: g.node, Sequence: decision.Sequence})
			if err != nil {
				return 0, err
			}
			g.lastTimestamp, g.sequence = int64(decision.Timestamp), decision.Sequence
			return id, nil
		case DecisionWait:
			if err := g.waitUntil(func(t int64) bool { return t >= int64(decision.WaitUntilTimestamp) }); err != nil {
				return 0, err
			}
		case DecisionWaitNextMs:
			if err := g.waitUntil(func(t int64) bool { return t > int64(decision.FromTimestamp) }); err != nil {
				return 0, err
			}
		case DecisionError:
			return 0, orbitError(decision.Error, "generate failed: %s", decision.Error)
		}
	}
}

func (g *Generator) waitUntil(predicate func(int64) bool) error {
	start := time.Now()
	for !predicate(g.clock.CurrentOrbitTimestampMs()) {
		if time.Since(start) > 30*time.Second {
			return orbitError(ClockRollback, "timed out waiting for clock to advance")
		}
		time.Sleep(time.Millisecond)
	}
	return nil
}
