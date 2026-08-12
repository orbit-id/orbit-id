// Package v2 implements the Orbit ID v2 Draft 128-bit format (alpha).
//
// Per docs/en/library-api.md this surface is not public for the Go 1.x
// module ("not public (`internal/v2` in alpha)"): it lives under
// internal/v2 and can only be imported from within this module (e.g. its
// own conformance tests), until a `/v2` module path makes it the default
// per the documented 1.x -> 2.0.0 migration.
package v2

import (
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	orbitid "github.com/orbit-id/go"
)

const (
	FormatVersionBits = 4
	TimestampBits     = 48
	TypeBits          = 16
	NodeBits          = 16
	SequenceBits      = 16
	ReservedBits      = 28

	FormatVersionShift = 124
	TimestampShift     = 76
	TypeShift          = 60
	NodeShift          = 44
	SequenceShift      = 28

	MaxFormatVersion int    = (1 << FormatVersionBits) - 1
	MaxTimestamp     uint64 = (1 << TimestampBits) - 1
	MaxType          int    = (1 << TypeBits) - 1
	MaxNode          int    = (1 << NodeBits) - 1
	MaxSequence      int    = (1 << SequenceBits) - 1
	MaxReserved      uint32 = (1 << ReservedBits) - 1

	// IssuedFormatVersion is the only FormatVersion issued Orbit ID v2 values
	// may use; decode fails closed on any other value.
	IssuedFormatVersion int = 1

	// OrbitEpochUnixMs and DefaultClockRollbackToleranceMs are identical to v1.
	OrbitEpochUnixMs                = orbitid.OrbitEpochUnixMs
	DefaultClockRollbackToleranceMs = orbitid.DefaultClockRollbackToleranceMs
)

// Types and error codes are shared with v1 so the code strings stay
// identical across the library; see docs/en/library-api.md.
type (
	ErrorCode             = orbitid.ErrorCode
	Error                 = orbitid.Error
	Clock                 = orbitid.Clock
	SequenceExhaustedMode = orbitid.SequenceExhaustedMode
	DecisionAction        = orbitid.DecisionAction
)

const (
	SequenceExhaustedWait = orbitid.SequenceExhaustedWait
	SequenceExhaustedFail = orbitid.SequenceExhaustedFail

	DecisionIssue      = orbitid.DecisionIssue
	DecisionWait       = orbitid.DecisionWait
	DecisionWaitNextMs = orbitid.DecisionWaitNextMs
	DecisionError      = orbitid.DecisionError

	InvalidType          = orbitid.InvalidType
	InvalidNode          = orbitid.InvalidNode
	InvalidSequence      = orbitid.InvalidSequence
	InvalidTimestamp     = orbitid.InvalidTimestamp
	InvalidDecimal       = orbitid.InvalidDecimal
	InvalidFormatVersion = orbitid.InvalidFormatVersion
	InvalidReserved      = orbitid.InvalidReserved
	ClockRollback        = orbitid.ClockRollback
	SequenceExhausted    = orbitid.SequenceExhausted
	NodeOwnershipLost    = orbitid.NodeOwnershipLost
)

// SystemClock returns the production wall-clock Orbit timestamp source.
func SystemClock() Clock { return orbitid.SystemClock() }

func orbitError(code ErrorCode, format string, args ...any) error {
	return &Error{Code: code, Message: fmt.Sprintf(format, args...)}
}

// u128Max is 2^128 - 1, the largest value an Orbit ID v2 may hold.
var u128Max = new(big.Int).Sub(new(big.Int).Lsh(big.NewInt(1), 128), big.NewInt(1))

// Fields are the decoded Orbit ID v2 fields. Timestamp is milliseconds
// since OrbitEpochUnixMs. Reserved is the low 28 bits, required to be 0.
type Fields struct {
	FormatVersion int
	Timestamp     uint64
	Type          int
	Node          int
	Sequence      int
	Reserved      uint32
}

// Encode validates fields and packs them into an unsigned 128-bit Orbit ID.
// Issued IDs MUST use FormatVersion 1 and Reserved 0.
func Encode(fields Fields) (*big.Int, error) {
	if fields.FormatVersion != IssuedFormatVersion {
		return nil, orbitError(InvalidFormatVersion, "formatVersion must be %d: %d", IssuedFormatVersion, fields.FormatVersion)
	}
	if fields.Timestamp > MaxTimestamp {
		return nil, orbitError(InvalidTimestamp, "timestamp out of range: %d", fields.Timestamp)
	}
	if fields.Type < 0 || fields.Type > MaxType {
		return nil, orbitError(InvalidType, "type out of range: %d", fields.Type)
	}
	if fields.Node < 0 || fields.Node > MaxNode {
		return nil, orbitError(InvalidNode, "node out of range: %d", fields.Node)
	}
	if fields.Sequence < 0 || fields.Sequence > MaxSequence {
		return nil, orbitError(InvalidSequence, "sequence out of range: %d", fields.Sequence)
	}
	if fields.Reserved != 0 {
		return nil, orbitError(InvalidReserved, "reserved must be 0 on encode: %d", fields.Reserved)
	}
	id := new(big.Int).Lsh(big.NewInt(int64(fields.FormatVersion)), FormatVersionShift)
	id.Or(id, new(big.Int).Lsh(new(big.Int).SetUint64(fields.Timestamp), TimestampShift))
	id.Or(id, new(big.Int).Lsh(big.NewInt(int64(fields.Type)), TypeShift))
	id.Or(id, new(big.Int).Lsh(big.NewInt(int64(fields.Node)), NodeShift))
	id.Or(id, new(big.Int).Lsh(big.NewInt(int64(fields.Sequence)), SequenceShift))
	id.Or(id, new(big.Int).SetUint64(uint64(fields.Reserved)))
	return id, nil
}

// Decode unpacks and validates an unsigned 128-bit Orbit ID. Unlike v1's
// unconditional Decode, this fails closed on an unknown FormatVersion or a
// non-zero Reserved, per the v2 Draft.
func Decode(id *big.Int) (Fields, error) {
	if id == nil || id.Sign() < 0 || id.Cmp(u128Max) > 0 {
		return Fields{}, orbitError(InvalidDecimal, "id out of unsigned 128-bit range")
	}
	formatVersion := int(new(big.Int).And(new(big.Int).Rsh(id, FormatVersionShift), big.NewInt(int64(MaxFormatVersion))).Int64())
	if formatVersion != IssuedFormatVersion {
		return Fields{}, orbitError(InvalidFormatVersion, "unknown or reserved formatVersion: %d", formatVersion)
	}
	reserved := uint32(new(big.Int).And(id, big.NewInt(int64(MaxReserved))).Uint64())
	if reserved != 0 {
		return Fields{}, orbitError(InvalidReserved, "non-zero reserved is rejected in alpha: %d", reserved)
	}
	timestamp := new(big.Int).And(new(big.Int).Rsh(id, TimestampShift), new(big.Int).SetUint64(MaxTimestamp)).Uint64()
	typ := int(new(big.Int).And(new(big.Int).Rsh(id, TypeShift), big.NewInt(int64(MaxType))).Int64())
	node := int(new(big.Int).And(new(big.Int).Rsh(id, NodeShift), big.NewInt(int64(MaxNode))).Int64())
	sequence := int(new(big.Int).And(new(big.Int).Rsh(id, SequenceShift), big.NewInt(int64(MaxSequence))).Int64())
	return Fields{
		FormatVersion: formatVersion,
		Timestamp:     timestamp,
		Type:          typ,
		Node:          node,
		Sequence:      sequence,
		Reserved:      reserved,
	}, nil
}

// Parse accepts a *big.Int Orbit ID or canonical decimal string and decodes it.
func Parse(id any) (Fields, error) {
	value, err := parseID(id)
	if err != nil {
		return Fields{}, err
	}
	return Decode(value)
}

func parseID(id any) (*big.Int, error) {
	switch value := id.(type) {
	case *big.Int:
		return value, nil
	case string:
		return FromDecimalString(value)
	}
	return nil, orbitError(InvalidDecimal, "id must be a *big.Int or canonical decimal string")
}

// GetFormatVersion returns the in-band format identifier.
func GetFormatVersion(id any) (int, error) {
	fields, err := Parse(id)
	return fields.FormatVersion, err
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

func GetReserved(id any) (uint32, error) {
	fields, err := Parse(id)
	return fields.Reserved, err
}

// IsValid reports syntactic validity only; it does not prove an ID was issued.
func IsValid(id any) bool {
	_, err := Parse(id)
	return err == nil
}

func ToDecimalString(id *big.Int) (string, error) {
	if id == nil || id.Sign() < 0 || id.Cmp(u128Max) > 0 {
		return "", orbitError(InvalidDecimal, "id out of unsigned 128-bit range")
	}
	return id.String(), nil
}

// FromDecimalString accepts only canonical, unsigned base-10 uint128 strings.
func FromDecimalString(input string) (*big.Int, error) {
	if input == "" {
		return nil, orbitError(InvalidDecimal, "empty decimal string")
	}
	if strings.HasPrefix(input, "+") || strings.HasPrefix(input, "-") ||
		strings.TrimSpace(input) != input || strings.Contains(input, ".") ||
		strings.Contains(strings.ToLower(input), "x") {
		return nil, orbitError(InvalidDecimal, "non-canonical decimal string")
	}
	if len(input) > 1 && input[0] == '0' {
		return nil, orbitError(InvalidDecimal, "leading zeros are not canonical")
	}
	for _, r := range input {
		if r < '0' || r > '9' {
			return nil, orbitError(InvalidDecimal, "non-canonical decimal string")
		}
	}
	value, ok := new(big.Int).SetString(input, 10)
	if !ok {
		return nil, orbitError(InvalidDecimal, "invalid decimal string")
	}
	if value.Sign() < 0 || value.Cmp(u128Max) > 0 {
		return nil, orbitError(InvalidDecimal, "decimal value outside unsigned 128-bit range")
	}
	return value, nil
}

func ToHexString(id *big.Int) (string, error) {
	if id == nil || id.Sign() < 0 || id.Cmp(u128Max) > 0 {
		return "", orbitError(InvalidDecimal, "id out of unsigned 128-bit range")
	}
	return fmt.Sprintf("0x%032x", id), nil
}

func ToUnixTimeMs(timestamp uint64) uint64 {
	return timestamp + uint64(OrbitEpochUnixMs)
}

// FromUnixTimeMs converts Unix milliseconds to an Orbit timestamp. A negative
// result is invalid for encoding and will be rejected by Generator/Encode.
func FromUnixTimeMs(unixMs int64) int64 {
	return unixMs - OrbitEpochUnixMs
}

type GeneratorOptions struct {
	Node                     int
	Clock                    Clock
	ClockRollbackToleranceMs int64
	OnSequenceExhausted      SequenceExhaustedMode
	// ConfirmOwnership may fail closed when a node lease is lost.
	ConfirmOwnership func() bool
}

// GenerateDecision describes the next safe generator action.
type GenerateDecision struct {
	Action             DecisionAction
	Timestamp          uint64
	Sequence           int
	WaitUntilTimestamp uint64
	FromTimestamp      uint64
	Error              ErrorCode
}

// Generator issues Orbit ID v2 values for one exclusively assigned node.
// Sequence is shared across Types, matching v1.
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
func (g *Generator) Generate(typ int) (*big.Int, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	for {
		decision := g.decideLocked(typ)
		switch decision.Action {
		case DecisionIssue:
			id, err := Encode(Fields{
				FormatVersion: IssuedFormatVersion, Timestamp: decision.Timestamp,
				Type: typ, Node: g.node, Sequence: decision.Sequence, Reserved: 0,
			})
			if err != nil {
				return nil, err
			}
			g.lastTimestamp, g.sequence = int64(decision.Timestamp), decision.Sequence
			return id, nil
		case DecisionWait:
			if err := g.waitUntil(func(t int64) bool { return t >= int64(decision.WaitUntilTimestamp) }); err != nil {
				return nil, err
			}
		case DecisionWaitNextMs:
			if err := g.waitUntil(func(t int64) bool { return t > int64(decision.FromTimestamp) }); err != nil {
				return nil, err
			}
		case DecisionError:
			return nil, orbitError(decision.Error, "generate failed: %s", decision.Error)
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
