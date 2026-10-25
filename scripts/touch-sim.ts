// Headless test of the touch-control state logic. Run: npm run test:touch
import assert from 'node:assert/strict'
import {
  touchInput, pressTouch, releaseTouch, releaseAllTouch, isTouchActive, onTouchChange,
  joystick, joystickPress, joystickMove, joystickRelease, axisFromOffset, smoothAxis
} from '../src/game/touchInput'

let changes = 0
const off = onTouchChange(() => changes++)

console.log('--- press / release ---')
pressTouch('gas', 1)
assert.equal(touchInput.gas, true)
releaseTouch('gas', 1)
assert.equal(touchInput.gas, false)

console.log('--- two fingers on one button: stays held until BOTH lift ---')
pressTouch('left', 1); pressTouch('left', 2)
releaseTouch('left', 1)
assert.equal(touchInput.left, true)
releaseTouch('left', 2)
assert.equal(touchInput.left, false)

console.log('--- repeated release / unknown pointer is harmless ---')
releaseTouch('brake', 99); releaseTouch('brake', 99)
assert.equal(touchInput.brake, false)

console.log('--- steer + gas + drift at the same time (multi-touch) ---')
pressTouch('right', 3); pressTouch('gas', 4); pressTouch('drift', 5)
assert.ok(touchInput.right && touchInput.gas && touchInput.drift)

console.log('--- focus loss / cancel: releaseAll clears everything ---')
releaseAllTouch()
assert.ok(!touchInput.right && !touchInput.gas && !touchInput.drift)
assert.equal(isTouchActive('gas'), false)
// a late "release" from the lifted finger afterwards must not break state
releaseTouch('gas', 4)
assert.equal(touchInput.gas, false)

console.log('--- change notifications fire (UI redraw) ---')
assert.ok(changes > 0)
console.log('--- flight buttons (up/down) behave like the others ---')
pressTouch('up', 7)
assert.equal(touchInput.up, true)
releaseAllTouch()
assert.equal(touchInput.up, false)

console.log('--- joystick axis maths (left is positive) ---')
assert.equal(axisFromOffset(0, 50, 0.1), 0)
assert.equal(axisFromOffset(-3, 50, 0.1), 0)            // inside dead zone
assert.ok(axisFromOffset(-50, 50, 0.1) === 1)           // full left
assert.ok(axisFromOffset(50, 50, 0.1) === -1)           // full right
const half = axisFromOffset(-25, 50, 0.1)
assert.ok(half > 0.4 && half < 0.5, `half-left should be ~0.44, got ${half}`)
assert.ok(axisFromOffset(-500, 50, 0.1) === 1)          // clamped

console.log('--- joystick press / move / release / cancel ---')
assert.equal(joystickPress(10), true)
assert.equal(joystickPress(11), false)                  // second finger ignored
joystickMove(11, 1); assert.equal(joystick.axis, 0)     // wrong finger ignored
joystickMove(10, -0.6); assert.equal(joystick.axis, -0.6)
joystickMove(10, 5); assert.equal(joystick.axis, 1)     // clamped
joystickRelease(11); assert.equal(joystick.pointer, 10) // wrong finger can't release
joystickRelease(10)
assert.equal(joystick.pointer, null); assert.equal(joystick.axis, 0)
joystickPress(12); joystickMove(12, 0.8)
releaseAllTouch()                                       // tab hidden / blur / mode switch
assert.equal(joystick.pointer, null); assert.equal(joystick.axis, 0)
joystickRelease(12)                                     // late release is harmless
assert.equal(joystick.axis, 0)

console.log('--- analog smoothing returns to neutral without snapping or overshoot ---')
let a = 0
for (let i = 0; i < 30; i++) a = smoothAxis(a, 1, 1 / 60)
assert.ok(a > 0.9 && a <= 1, `should follow quickly, got ${a}`)
let back = a, steps = 0, min = back
while (Math.abs(back) > 0.02 && steps < 600) { back = smoothAxis(back, 0, 1 / 60); min = Math.min(min, back); steps++ }
console.log(`return to neutral takes ${(steps / 60 * 1000).toFixed(0)} ms (60 fps)`)
assert.ok(steps > 3 && steps < 60 && min >= 0, 'smooth return, no overshoot')

off()
console.log(`ALL TOUCH INPUT CHECKS PASSED (${changes} change notifications)`)
