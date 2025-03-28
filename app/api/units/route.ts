import { NextResponse, NextRequest } from "next/server";

import prisma from "@/utils/DB";
/**
 *  @method  GET
 *  @route   ~/api/units
 *  @desc    Get all years
 *  @access  public
 */


export async function GET(req: NextRequest) {
    try {
        console.log("hi api/units ")
        const units = await prisma.unit.findMany({ include: { lessons: true } });
        return NextResponse.json({ "units": units }, { status: 200 });
    } catch (error) {

        return NextResponse.json(
            { message: "internal server error", error },
            { status: 500 }
        )
    }
}
/**
 *  @method  POST
 *  @route   ~/api/semesters
 *  @desc    Get all years
 *  @access  public
 */


export async function POST(req: NextRequest) {
    try {
        console.log("hi ...................")

        const body = await req.json();
        const units = await prisma.unit.create({ data: body });
        return NextResponse.json({ "units": units }, { status: 200 });
    } catch (error) {

        return NextResponse.json(
            { message: "internal server error", error },
            { status: 500 }
        )
    }
}