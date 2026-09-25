# E-stop and motion-limit test

Do not begin with either motor connected. The physical E-stop must remove L298
motor power independently of GPIO23 or firmware.

## 1. Logic-only E-stop check

1. Disconnect 12 V motor power and both motor outputs.
2. Power only the LOLIN32 logic supply.
3. Confirm GPIO23 is HIGH when the status contact is released.
4. Activate the E-stop and confirm GPIO23 goes LOW.
5. Confirm serial prints `estop active; targets cleared`.
6. Release the E-stop and confirm serial prints that a new command is required.

Stop if the input polarity is reversed; correct the auxiliary contact wiring before
continuing.

## 2. Stale-command check

1. Keep the motors disconnected.
2. Send a Point command and confirm it is received.
3. Activate and release the E-stop.
4. Confirm both reported PWM values remain zero until another command arrives.

## 3. Physical power-cut check

1. Keep the motors disconnected and connect a multimeter to the driver motor rail.
2. Apply motor power through the normally closed E-stop circuit.
3. Activate the E-stop and confirm the motor rail loses power.
4. Confirm releasing GPIO23 alone cannot restore power while the E-stop remains
   mechanically latched.

## 4. Motion-limit checks

Only continue with the antenna safely supported and one motor connected at a
time. Verify the configured AZ blocked zone first, then verify the EL lower and
upper limits using low-speed commands. Stop immediately if measured motion moves
away from the expected direction or approaches a physical hard stop.

Record the tested input polarity, AZ blocked-zone angles, EL limits, and result
of every stop test before marking ASTT-051 complete.
