<?php

namespace App\Http\Requests\Locker;

use Illuminate\Foundation\Http\FormRequest;

class StoreLocationUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'eventId' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            // v1.1 BAG_DRAWER_CHANGED, keep v1.0 BAG_LOCATION_CHANGED for backward compat
            'eventType' => ['required', 'string', 'in:BAG_LOCATION_CHANGED,BAG_DRAWER_CHANGED'],
            'bagNo' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'voucherNo' => ['required', 'string', 'max:100'],
            // v1.0
            'oldLocation' => ['nullable', 'string', 'max:50'],
            'newLocation' => ['nullable', 'string', 'max:50'],
            // v1.1 drawerCode
            'oldDrawerCode' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'newDrawerCode' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'movementType' => ['required', 'string', 'in:CONSOLIDATION,IN,OUT,RELOCATION,TRANSFER'],
            'occurredAt' => ['required', 'date'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $hasOldLoc = ! empty($this->input('oldLocation'));
            $hasNewLoc = ! empty($this->input('newLocation'));
            $hasOldDraw = ! empty($this->input('oldDrawerCode'));
            $hasNewDraw = ! empty($this->input('newDrawerCode'));
            if (! ($hasOldLoc && $hasNewLoc) && ! ($hasOldDraw && $hasNewDraw)) {
                $validator->errors()->add('oldLocation', 'Either oldLocation/newLocation (v1.0) or oldDrawerCode/newDrawerCode (v1.1) required');
            }
        });
    }

    public function messages(): array
    {
        return [
            'eventId.required' => 'eventId is required',
            'eventType.in' => 'eventType must be BAG_LOCATION_CHANGED',
            'movementType.in' => 'movementType invalid',
            'occurredAt.date' => 'occurredAt must be a valid datetime',
        ];
    }

    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        throw new \Illuminate\Http\Exceptions\HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errorCode' => 'VALIDATION_ERROR',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
