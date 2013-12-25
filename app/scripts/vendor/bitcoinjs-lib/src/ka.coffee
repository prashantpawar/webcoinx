rho = [ 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8 ]

rl = [[0..15]] # id
rr = [((9*i + 5) & 15 for i in [0..15])] # pi

for i in [0..4]
	rl = rl.concat [rho[i] for i in rl[rl.length-1]] # id ^ 4
	rr = rr.concat [rho[i] for i in rl[rl.length-1]] # pi ^ 4
console.log(rl)
console.log(rr)
