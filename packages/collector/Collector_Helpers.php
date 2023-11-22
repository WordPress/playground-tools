<?php
function collector_get_tmpfile($name, $type)
{
	$tmpDir  = get_temp_dir();
    $tmpName = tempnam($tmpDir . '/', 'clctr-'. date('Y-m-d_H-i-s-') . $name . '-');
    $typName = $tmpName . '.' . $type;
    touch($typName);
    unlink($tmpName);

    return $typName;
}

function collector_get_fakepass()
{
    $fakepass = base64_encode(random_bytes(128));

    set_transient('COLLECTOR_FAKE_PASSWORD', $fakepass, 60 * 5);

    return $fakepass;
}

function collector_use_fakepass()
{
    $fakepass = get_transient('COLLECTOR_FAKE_PASSWORD');

    delete_transient('COLLECTOR_FAKE_PASSWORD');

    return $fakepass;
}
