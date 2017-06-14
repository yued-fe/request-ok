const mongoose = require('mongoose')

let InspectSchema = new mongoose.Schema({
	page: String,

	urls: [{
		url: String,
		status: Number,
		// statusText: String,
		// mimeType: String,
		// remoteIPAddress: String,
		// remotePort: Number,
		// encodedDataLength: Number
	}],

	meta: {
		createAt: {
			type: Date,
			default: Date.now()
		},
		updateAt: {
			type: Date,
			default: Date.now()
		}
	}
})

// 前置逻辑 在存储以前
InspectSchema.pre('save', (next) => {
	if(this.isNew) {
		// this指向UserSchema
		this.meta.createAt = this.meta.updateAt = Date.now()
	} else {
		this.meta.updateAt = Date.now()
	}
	next()
})

module.exports = mongoose.model('Inspect', InspectSchema)