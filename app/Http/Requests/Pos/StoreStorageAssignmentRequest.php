<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class StoreStorageAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'batchNo' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'items' => ['required', 'array', 'min:1', 'max:1000'],
            'items.*.voucherNo' => ['required', 'string', 'max:100'],
            'items.*.voucherDate' => ['required', 'date_format:Y-m-d'],
            'items.*.bagNo' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            // v1.1 drawerCode (preferred) — v1.0 location kept for backward compat
            'items.*.drawerCode' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'items.*.location' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-_]+$/'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);
            foreach ($items as $idx => $item) {
                $hasDrawer = ! empty($item['drawerCode']);
                $hasLoc = ! empty($item['location']);
                if (! $hasDrawer && ! $hasLoc) {
                    $validator->errors()->add("items.$idx.drawerCode", 'Either drawerCode (v1.1) or location (v1.0) is required');
                }
                if (! empty($item['drawerCode']) && ! preg_match('/^[A-Za-z0-9\-_]+$/', $item['drawerCode'])) {
                    $validator->errors()->add("items.$idx.drawerCode", 'drawerCode format invalid (e.g. D001)');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'batchNo.required' => 'batchNo is required',
            'batchNo.regex' => 'batchNo contains invalid characters',
            'items.required' => 'items is required',
            'items.min' => 'items must contain at least one entry',
            'items.max' => 'items may not contain more than 1000 entries (batch too large)',
            'items.*.voucherNo.required' => 'voucherNo is required for each item',
            'items.*.voucherDate.required' => 'voucherDate is required',
            'items.*.voucherDate.date_format' => 'voucherDate must use YYYY-MM-DD',
            'items.*.bagNo.required' => 'bagNo is required',
            'items.*.drawerCode.regex' => 'drawerCode format invalid (e.g. D001)',
            'items.*.location.regex' => 'location format invalid',
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
