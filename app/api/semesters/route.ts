import { NextResponse, NextRequest } from "next/server";

import prisma from "@/utils/DB";
/**
 *  @method  GET
 *  @route   ~/api/semesters
 *  @desc    Get all years
 *  @access  public
 */


export async function GET(req: NextRequest) {
    try {
        console.log("hi ...................")
        const semesters = await prisma.semester.findMany({ include: { year: true } });
        return NextResponse.json({ "semesters": semesters }, { status: 200 });
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
        const semesters = await prisma.semester.create({ data: body });
        return NextResponse.json({ "semesters": semesters }, { status: 200 });
    } catch (error) {

        return NextResponse.json(
            { message: "internal server error", error },
            { status: 500 }
        )
    }
}